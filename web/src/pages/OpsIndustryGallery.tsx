import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PhotoGallery from '../components/PhotoGallery';
import { supervisorService } from '../services/supervisorService';
import { industryService } from '../services/industryService';
import { useAuth } from '../context/AuthContext';

function todayISOInBRT(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function statusBadge(status: 'sem_foto' | 'justificado' | 'sem_visita') {
  if (status === 'sem_foto') return <Badge variant="error" size="sm">Sem foto</Badge>;
  if (status === 'sem_visita') return <Badge variant="error" size="sm">Sem visita</Badge>;
  return <Badge variant="warning" size="sm">Justificado</Badge>;
}

export default function OpsIndustryGallery() {
  const { user } = useAuth();
  const [industryId, setIndustryId] = useState('');
  const [state, setState] = useState('ALL');
  const [date, setDate] = useState(todayISOInBRT());
  const [promoterId, setPromoterId] = useState('ALL');
  const [view, setView] = useState<'all' | 'sent' | 'missing'>('all');
  const [promoterFilterMode, setPromoterFilterMode] = useState<'ALL' | 'sent' | 'missing'>('ALL');
  const [page, setPage] = useState(1);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const { data: statesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });
  const states: string[] = statesData?.states || [];

  const { data: industries = [] } = useQuery({
    queryKey: ['industries', 'active'],
    queryFn: () => industryService.listIndustries(true),
  });

  const sortedIndustries = useMemo(
    () =>
      [...industries].sort((a, b) =>
        (a.abbreviation || a.code || a.name).localeCompare(b.abbreviation || b.code || b.name)
      ),
    [industries]
  );

  const apiState = state === 'ALL' ? undefined : state;
  const apiPromoterId = promoterId === 'ALL' ? undefined : promoterId;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: [
      'ops',
      'industry-gallery',
      industryId,
      apiState,
      date,
      apiPromoterId,
      view,
      page,
    ],
    queryFn: () =>
      supervisorService.getOpsIndustryGallery({
        industryId,
        state: apiState,
        date,
        promoterId: apiPromoterId,
        view,
        page,
        limit: 48,
      }),
    enabled: !!industryId,
  });

  const promoterOptions = useMemo(() => {
    const list = data?.promoters || [];
    if (promoterFilterMode === 'sent') return list.filter((p) => p.hasSent);
    if (promoterFilterMode === 'missing') return list.filter((p) => p.hasMissing);
    return list;
  }, [data?.promoters, promoterFilterMode]);

  const galleryPhotos = useMemo(
    () =>
      (data?.photos || []).map((p) => ({
        id: p.id,
        url: p.url,
        type: 'OTHER' as const,
        createdAt: p.createdAt,
        industryName: data?.industry.name,
        industryAbbreviation: data?.industry.abbreviation,
      })),
    [data?.photos, data?.industry]
  );

  const selectedIndustry = sortedIndustries.find((i) => i.id === industryId);
  const totalPages = data ? Math.max(1, Math.ceil(data.totalPhotos / data.limit)) : 1;

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Galeria por indústria</h1>
          <p className="text-text-secondary text-sm mt-1">
            Escolha a indústria, filtre por promotor / UF / dia e veja quem{' '}
            <span className="text-primary-400 font-semibold">enviou</span> e quem{' '}
            <span className="text-error-400 font-semibold">não enviou</span> foto
            {user?.role === 'SUPERVISOR' ? ' (sua equipe)' : ''}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={!industryId || isFetching}
        >
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-tertiary min-w-[220px] flex-1">
              Indústria *
              <select
                value={industryId}
                onChange={(e) => {
                  setIndustryId(e.target.value);
                  setPromoterId('ALL');
                  setPage(1);
                }}
                className="bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary"
              >
                <option value="">Selecione...</option>
                {sortedIndustries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.abbreviation || i.code} — {i.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              Data
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
                className="bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              UF
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
                className="bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary"
              >
                <option value="ALL">Todas</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-text-tertiary min-w-[200px]">
              Promotor
              <select
                value={promoterId}
                onChange={(e) => {
                  setPromoterId(e.target.value);
                  setPage(1);
                }}
                className="bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary"
                disabled={!industryId}
              >
                <option value="ALL">Todos</option>
                {promoterOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.hasMissing ? ' · pendente' : ''}
                    {p.photosSent ? ` · ${p.photosSent} foto(s)` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              Lista de promotores
              <select
                value={promoterFilterMode}
                onChange={(e) =>
                  setPromoterFilterMode(e.target.value as 'ALL' | 'sent' | 'missing')
                }
                className="bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary"
              >
                <option value="ALL">Todos no escopo</option>
                <option value="sent">Só quem enviou</option>
                <option value="missing">Só quem não enviou</option>
              </select>
            </label>

            <div className="flex gap-1">
              {(
                [
                  ['all', 'Tudo'],
                  ['sent', 'Galeria'],
                  ['missing', 'Pendentes'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setView(v);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                    view === v
                      ? 'bg-primary-600/20 text-primary-400 border-primary-600'
                      : 'bg-dark-background text-text-secondary border-dark-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {!industryId ? (
        <Card>
          <CardContent className="py-10 text-center text-text-secondary">
            Selecione uma indústria para começar.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-text-secondary">Carregando...</p>
      ) : isError ? (
        <p className="text-error-400">Erro ao carregar. Tente atualizar.</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Fotos enviadas</div>
                <div className="text-2xl font-bold text-text-primary">{data.stats.sentPhotos}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Promotores que enviaram</div>
                <div className="text-2xl font-bold text-text-primary">
                  {data.stats.promotersSent}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Promotores com pendência</div>
                <div className="text-2xl font-bold text-text-primary">
                  {data.stats.promotersMissing}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Lojas sem foto</div>
                <div className="text-2xl font-bold text-text-primary">
                  {data.stats.missingPairs}
                </div>
              </CardContent>
            </Card>
          </div>

          {(view === 'all' || view === 'sent') && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">
                  Galeria — {selectedIndustry?.abbreviation || selectedIndustry?.name}
                </h2>
              </CardHeader>
              <CardContent>
                {!data.photos.length ? (
                  <p className="text-sm text-text-secondary">Nenhuma foto neste filtro.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {data.photos.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          className="group text-left rounded-lg overflow-hidden border border-dark-border hover:border-primary-500/60 bg-dark-background"
                          onClick={() => {
                            setGalleryIndex(idx);
                            setGalleryOpen(true);
                          }}
                        >
                          <div className="aspect-square bg-dark-card overflow-hidden">
                            <img
                              src={p.url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-2">
                            <div className="text-xs font-medium text-text-primary truncate">
                              {p.promoter.name}
                            </div>
                            <div className="text-[11px] text-text-secondary truncate">
                              {p.store.name}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-text-secondary">
                          {page} / {totalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {(view === 'all' || view === 'missing') && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">
                  Quem não enviou — {data.date}
                </h2>
              </CardHeader>
              <CardContent>
                {!data.missing.length ? (
                  <p className="text-sm text-text-secondary">
                    Nenhuma pendência neste filtro. Todos enviaram (ou não há expectativa).
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-text-secondary border-b border-dark-border">
                          <th className="py-2 pr-2">Promotor</th>
                          <th className="py-2 pr-2">Loja</th>
                          <th className="py-2 pr-2">UF</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.missing.map((m) => (
                          <tr
                            key={`${m.promoterId}-${m.storeId}`}
                            className="border-b border-dark-border/50"
                          >
                            <td className="py-2 pr-2 text-text-primary">{m.promoterName}</td>
                            <td className="py-2 pr-2 text-text-secondary">{m.storeName}</td>
                            <td className="py-2 pr-2 text-text-secondary">
                              {m.storeState || m.promoterState || '—'}
                            </td>
                            <td className="py-2">{statusBadge(m.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-text-primary">Resumo por promotor</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {promoterOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPromoterId(p.id);
                      setPage(1);
                    }}
                    className={`text-left p-3 rounded-lg border ${
                      promoterId === p.id
                        ? 'border-primary-500 bg-primary-600/10'
                        : 'border-dark-border hover:border-primary-600/40'
                    }`}
                  >
                    <div className="font-medium text-text-primary text-sm">{p.name}</div>
                    <div className="text-xs text-text-secondary mt-1 flex gap-2 flex-wrap">
                      <span>{p.photosSent} foto(s)</span>
                      {p.hasMissing ? (
                        <Badge variant="error" size="sm">
                          {p.missingPairs} pendente(s)
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          OK
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {galleryOpen && galleryPhotos.length > 0 && (
        <PhotoGallery
          photos={galleryPhotos}
          initialIndex={galleryIndex}
          preserveOrder
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          promoterName={data?.photos[galleryIndex]?.promoter.name}
          storeName={data?.photos[galleryIndex]?.store.name}
        />
      )}
    </div>
  );
}
