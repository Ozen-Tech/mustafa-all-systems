import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supervisorService } from '../services/supervisorService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PhotoGallery from '../components/PhotoGallery';

type PhotoWithIndustry = {
  id?: string;
  type?: string;
  url: string;
  createdAt?: string | Date;
  industryAbbreviation?: string | null;
  industryName?: string | null;
};

function getIndustryLabel(photo: PhotoWithIndustry) {
  if (photo.industryAbbreviation) return photo.industryAbbreviation;
  if (photo.industryName) return photo.industryName;
  return '—';
}

function getWorkPhotos(visit: {
  photos?: PhotoWithIndustry[];
  checkInPhotoUrl?: string | null;
  checkOutPhotoUrl?: string | null;
}): PhotoWithIndustry[] {
  const photos = visit.photos || [];
  return photos.filter(
    (p) => (p.type === 'OTHER' || !p.type) && p.url !== visit.checkInPhotoUrl && p.url !== visit.checkOutPhotoUrl
  );
}

function groupPhotosByIndustry(workPhotos: PhotoWithIndustry[]) {
  const byIndustry = new Map<string, PhotoWithIndustry[]>();
  for (const p of workPhotos) {
    const label = getIndustryLabel(p);
    if (!byIndustry.has(label)) byIndustry.set(label, []);
    byIndustry.get(label)!.push(p);
  }
  return Array.from(byIndustry.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([industryLabel, photos]) => ({ industryLabel, photos }));
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23241F35" width="120" height="120"/%3E%3Ctext fill="%239CA3AF" font-size="11" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem imagem%3C/text%3E%3C/svg%3E';

function DayExecutionsPanel({
  promoterId,
  date,
  onOpenGallery,
}: {
  promoterId: string;
  date: string;
  onOpenGallery: (visit: any) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promoter-visits-day', promoterId, date],
    queryFn: () => supervisorService.getPromoterVisitsByDate(promoterId, date),
  });

  if (isLoading) {
    return (
      <div className="px-5 py-6 flex items-center gap-3 text-text-secondary text-sm">
        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        Carregando lojas e fotos deste dia…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-5 py-4 text-sm text-error-400">
        Não foi possível carregar as execuções deste dia.
      </div>
    );
  }

  const visits = data?.visits || [];
  if (visits.length === 0) {
    return <div className="px-5 py-4 text-sm text-text-tertiary">Nenhuma visita neste dia.</div>;
  }

  return (
    <div className="px-5 py-4 space-y-6 border-t border-dark-border bg-dark-backgroundSecondary/30">
      {visits.map((visit: any) => {
        const workPhotos = getWorkPhotos(visit);
        const byIndustry = groupPhotosByIndustry(workPhotos);
        const storeName = visit.store?.name || '—';
        const checkInStr = format(new Date(visit.checkInAt), 'HH:mm');
        const checkOutStr = visit.checkOutAt ? format(new Date(visit.checkOutAt), 'HH:mm') : '—';
        const done = !!visit.checkOutAt;

        return (
          <div key={visit.id} className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-dark-border">
              <div className="min-w-0">
                <div className="text-text-primary font-semibold truncate">{storeName}</div>
                <div className="text-text-tertiary text-xs mt-0.5">
                  {checkInStr} → {checkOutStr}
                  {visit.hoursWorked ? ` · ${visit.hoursWorked}h` : ''}
                </div>
              </div>
              <Badge variant={done ? 'success' : 'warning'} size="sm">
                {done ? 'Feita' : 'Em execução'}
              </Badge>
            </div>

            <div className="px-4 py-3 space-y-4">
              {(visit.checkInPhotoUrl || visit.checkOutPhotoUrl) && (
                <div className="flex gap-3">
                  {visit.checkInPhotoUrl && (
                    <button
                      type="button"
                      className="w-16 h-16 rounded-lg overflow-hidden border border-dark-border"
                      onClick={() => onOpenGallery(visit)}
                      title="Check-in"
                    >
                      <img
                        src={visit.checkInPhotoUrl}
                        alt="Check-in"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMG;
                        }}
                      />
                    </button>
                  )}
                  {visit.checkOutPhotoUrl && (
                    <button
                      type="button"
                      className="w-16 h-16 rounded-lg overflow-hidden border border-dark-border"
                      onClick={() => onOpenGallery(visit)}
                      title="Check-out"
                    >
                      <img
                        src={visit.checkOutPhotoUrl}
                        alt="Check-out"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMG;
                        }}
                      />
                    </button>
                  )}
                  <div className="text-[11px] text-text-tertiary self-center">Check-in / check-out</div>
                </div>
              )}

              {byIndustry.length === 0 ? (
                <p className="text-text-tertiary text-sm">Nenhuma foto de trabalho nesta loja.</p>
              ) : (
                byIndustry.map(({ industryLabel, photos }) => (
                  <div key={industryLabel}>
                    <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-1 h-3.5 rounded-full bg-primary-500" />
                      {industryLabel}
                      <span className="font-normal">({photos.length})</span>
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {photos.map((photo, idx) => (
                        <button
                          key={photo.id || idx}
                          type="button"
                          className="relative rounded-lg overflow-hidden bg-dark-backgroundSecondary aspect-square focus:outline-none focus:ring-2 focus:ring-primary-500/50 group"
                          onClick={() => onOpenGallery(visit)}
                        >
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMG;
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 px-1 text-[10px] text-white truncate">
                            {photo.createdAt ? format(new Date(photo.createdAt), 'HH:mm') : '—'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {(workPhotos.length > 0 || visit.checkInPhotoUrl) && (
                <Button variant="outline" size="sm" onClick={() => onOpenGallery(visit)}>
                  Ver galeria desta loja
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PromoterDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || '';

  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set(initialDate ? [initialDate] : [])
  );
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [filterState, setFilterState] = useState('');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['promoter-visit-days', id],
    queryFn: () => supervisorService.getPromoterVisitDays(id!),
    enabled: !!id,
  });

  const { data: performance } = useQuery({
    queryKey: ['promoter-performance', id],
    queryFn: () => supervisorService.getPromoterPerformance(id!),
    enabled: !!id,
  });

  const { data: myStatesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });

  const promoter = summary?.promoter;
  const days = summary?.days || [];
  const supervisorStates = myStatesData?.states ?? [];

  useEffect(() => {
    if (initialDate) {
      setExpandedDays((prev) => new Set(prev).add(initialDate));
      requestAnimationFrame(() => {
        document.getElementById(`day-${initialDate}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [initialDate]);

  const filteredDays = useMemo(() => {
    if (!filterState) return days;
    return days.filter((d) => (d.states || []).includes(filterState));
  }, [days, filterState]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const openGallery = (visit: any) => {
    setSelectedVisit(visit);
    setIsGalleryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-text-secondary">Carregando perfil…</div>
        </div>
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="page-shell">
        <Card>
          <CardContent className="py-10 text-center text-text-tertiary">Promotor não encontrado.</CardContent>
        </Card>
      </div>
    );
  }

  const stats = performance?.stats;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 mb-3 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-amber-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-2 ring-dark-border shrink-0">
              {promoter.avatarUrl ? (
                <img
                  src={promoter.avatarUrl}
                  alt={promoter.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                promoter.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-text-primary truncate">{promoter.name}</h1>
              <div className="text-text-secondary text-sm mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {promoter.state && <span>UF: {promoter.state}</span>}
                <span className="truncate">{promoter.email}</span>
                {promoter.phone && <span>{promoter.phone}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/routes/config">
            <Button variant="outline" size="sm">
              Configurar rota
            </Button>
          </Link>
          <Link to={`/promoters/${id}/route`}>
            <Button variant="accent" size="sm">
              Ver mapa
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Visitas (período)', value: stats?.totalVisits ?? days.reduce((s, d) => s + d.visitCount, 0) },
          { label: 'Concluídas', value: stats?.completedVisits ?? '—' },
          { label: 'Fotos', value: stats?.totalPhotos ?? days.reduce((s, d) => s + d.photoCount, 0) },
          { label: 'Dias com visita', value: days.length },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="py-4">
              <div className="text-text-tertiary text-xs uppercase tracking-wider">{kpi.label}</div>
              <div className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {supervisorStates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider mr-1">Estado:</span>
          <button
            type="button"
            onClick={() => setFilterState('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !filterState
                ? 'bg-primary-600 text-white'
                : 'bg-dark-card border border-dark-border text-text-secondary hover:border-primary-500/50'
            }`}
          >
            Todos
          </button>
          {supervisorStates.sort().map((uf: string) => (
            <button
              key={uf}
              type="button"
              onClick={() => setFilterState(uf)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterState === uf
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-card border border-dark-border text-text-secondary hover:border-primary-500/50'
              }`}
            >
              {uf}
            </button>
          ))}
        </div>
      )}

      {/* Execuções por dia — lazy */}
      <Card>
        <CardHeader>
          <div className="text-text-primary font-bold">Execuções</div>
          <div className="text-text-secondary text-xs mt-1">
            Abra um dia para carregar as lojas feitas e as fotos. Nada de foto é baixado antes disso.
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredDays.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-tertiary text-sm">Nenhuma visita encontrada.</div>
          ) : (
            <div className="divide-y divide-dark-border">
              {filteredDays.map((day) => {
                const open = expandedDays.has(day.date);
                const label = format(new Date(day.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR });

                return (
                  <div key={day.date} id={`day-${day.date}`}>
                    <button
                      type="button"
                      onClick={() => toggleDay(day.date)}
                      className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-primary-600/5 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 text-text-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-text-primary font-semibold capitalize">{label}</div>
                        <div className="text-text-tertiary text-xs mt-0.5 truncate">
                          {day.storeNames.length > 0 ? day.storeNames.join(' · ') : '—'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge variant="success" size="sm">
                          {day.storesDone} feita{day.storesDone === 1 ? '' : 's'}
                        </Badge>
                        {day.storesOpen > 0 && (
                          <Badge variant="warning" size="sm">
                            {day.storesOpen} aberta{day.storesOpen === 1 ? '' : 's'}
                          </Badge>
                        )}
                        <Badge variant="gray" size="sm">
                          {day.photoCount} foto{day.photoCount === 1 ? '' : 's'}
                        </Badge>
                      </div>
                    </button>

                    {open && id && (
                      <DayExecutionsPanel promoterId={id} date={day.date} onOpenGallery={openGallery} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVisit && (
        <PhotoGallery
          photos={selectedVisit.photos || []}
          checkInPhotoUrl={selectedVisit.checkInPhotoUrl}
          checkOutPhotoUrl={selectedVisit.checkOutPhotoUrl}
          isOpen={isGalleryOpen}
          onClose={() => {
            setIsGalleryOpen(false);
            setSelectedVisit(null);
          }}
          visitDate={format(new Date(selectedVisit.checkInAt), "dd/MM/yyyy 'às' HH:mm")}
          storeName={selectedVisit.store?.name}
          promoterName={promoter.name}
        />
      )}
    </div>
  );
}
