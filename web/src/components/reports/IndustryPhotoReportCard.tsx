import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import { toast } from '../ui/Toaster';
import { supervisorService, MISS_REASON_LABELS } from '../../services/supervisorService';
import { industryService } from '../../services/industryService';
import { downloadIndustryPhotoCsv, generateIndustryPhotoPdf } from '../../utils/industryPhotoReport';

const selectClass =
  'w-full px-4 py-2.5 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all bg-dark-card text-text-primary';

export default function IndustryPhotoReportCard() {
  const [industryId, setIndustryId] = useState('');
  const [state, setState] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: industries = [] } = useQuery({
    queryKey: ['industries', 'active'],
    queryFn: () => industryService.listIndustries(true),
  });
  const sortedIndustries = useMemo(
    () => [...industries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [industries]
  );

  const { data: statesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });
  const states: string[] = statesData?.states || [];

  const validRange = !!startDate && !!endDate && startDate <= endDate;
  const { data: report, isFetching, isError } = useQuery({
    queryKey: ['reports', 'industry-photos', industryId, state, startDate, endDate],
    queryFn: () =>
      supervisorService.getIndustryPhotoReport({
        industryId,
        startDate,
        endDate,
        state: state || undefined,
      }),
    enabled: !!industryId && validRange,
  });

  const coverage =
    report && report.summary.expectedStores
      ? Math.round((report.summary.coveredExpectedStores / report.summary.expectedStores) * 100)
      : null;

  async function handlePdf() {
    if (!report) return;
    if (report.summary.photos === 0) {
      toast.info('Nenhuma foto desta indústria no período selecionado');
      return;
    }
    setPdfProgress({ done: 0, total: report.stores.reduce((n, s) => n + s.photos.length, 0) });
    try {
      await generateIndustryPhotoPdf(report, (done, total) => setPdfProgress({ done, total }));
    } catch (error: any) {
      toast.error('Erro ao gerar PDF: ' + (error?.message || 'erro desconhecido'));
    } finally {
      setPdfProgress(null);
    }
  }

  function handleCsv() {
    if (!report) return;
    downloadIndustryPhotoCsv(report);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-text-primary">Relatório de Fotos por Indústria</h2>
        <p className="text-sm text-text-tertiary mt-1">
          Todas as fotos de uma indústria no período, organizadas por loja, com as lojas que ficaram sem foto e as
          justificativas
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-700 mb-1.5">Indústria</label>
            <select value={industryId} onChange={(e) => setIndustryId(e.target.value)} className={selectClass}>
              <option value="">Selecione a indústria</option>
              {sortedIndustries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.abbreviation ? ` (${i.abbreviation})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-700 mb-1.5">UF</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className={selectClass}>
              <option value="">Todas</option>
              {states.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <Input label="Data Inicial" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Data Final" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {!validRange && (
          <p className="text-sm text-red-400 mb-4">A data inicial precisa ser anterior ou igual à final.</p>
        )}

        {!industryId ? (
          <p className="text-sm text-text-tertiary">Selecione uma indústria para ver o resumo e exportar.</p>
        ) : isFetching && !report ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-sm text-red-400">Não foi possível carregar o relatório. Tente novamente.</p>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                ['Fotos', report.summary.photos],
                ['Lojas com foto', report.summary.stores],
                ['Visitas', report.summary.visits],
                ['Cobertura', coverage != null ? `${coverage}%` : '—'],
                ['Lojas sem foto', report.summary.storesWithoutPhotos],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-dark-border p-3">
                  <p className="text-2xl font-bold text-text-primary">{value}</p>
                  <p className="text-xs text-text-tertiary">{label}</p>
                </div>
              ))}
            </div>

            {report.truncated && (
              <p className="text-sm text-amber-400 mb-4">
                O período tem muitas fotos; a exportação inclui as primeiras 2000. Reduza o período para ver todas.
              </p>
            )}

            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handlePdf}
                disabled={!!pdfProgress || isFetching}
              >
                {pdfProgress
                  ? `Montando PDF... ${pdfProgress.done}/${pdfProgress.total} fotos`
                  : '📸 Baixar PDF com fotos'}
              </Button>
              <Button variant="outline" size="lg" onClick={handleCsv} disabled={isFetching}>
                📈 Baixar planilha (Excel)
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Lojas com foto
                </h3>
                {report.stores.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Nenhuma foto no período.</p>
                ) : (
                  <ul className="divide-y divide-dark-border max-h-80 overflow-y-auto">
                    {report.stores.map((s) => (
                      <li key={s.store.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {s.store.name}
                            {s.store.state ? ` - ${s.store.state}` : ''}
                          </p>
                          <p className="text-xs text-text-tertiary truncate">{s.promoters.join(', ')}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.ruptures > 0 && (
                            <Badge variant="error" size="sm">
                              {s.ruptures} ruptura{s.ruptures > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="success" size="sm">
                            {s.photoCount} foto{s.photoCount > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Lojas sem foto
                </h3>
                {report.storesWithoutPhotos.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Todas as lojas atendidas tiveram foto. ✅</p>
                ) : (
                  <ul className="divide-y divide-dark-border max-h-80 overflow-y-auto">
                    {report.storesWithoutPhotos.map((item) => (
                      <li key={item.store.id} className="py-2">
                        <p className="text-sm font-medium text-text-primary">
                          {item.store.name}
                          {item.store.state ? ` - ${item.store.state}` : ''}
                        </p>
                        {item.misses.length === 0 ? (
                          <p className="text-xs text-amber-400">Sem justificativa</p>
                        ) : (
                          item.misses.map((m, idx) => (
                            <p key={idx} className="text-xs text-text-tertiary">
                              {MISS_REASON_LABELS[m.reason] ?? m.reason}
                              {m.note ? ` - ${m.note}` : ''} · {m.promoterName}
                            </p>
                          ))
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
