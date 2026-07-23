import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { supervisorService } from '../services/supervisorService';
import { industryService } from '../services/industryService';
import { useAuth } from '../context/AuthContext';
import { formatTimeBR } from '../components/ops/opsFormat';

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

type AuditStatus = 'sem_foto' | 'justificado' | 'sem_visita';

function statusBadge(status: AuditStatus) {
  if (status === 'sem_foto') return <Badge variant="error" size="sm">Sem foto</Badge>;
  if (status === 'sem_visita') return <Badge variant="error" size="sm">Sem visita</Badge>;
  return <Badge variant="warning" size="sm">Justificado</Badge>;
}

function shortStoreName(name: string): string {
  const parts = name.split(/\s*[–—-]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const first = parts[0];
    if (last.length <= 32) return `${first} · ${last}`;
  }
  return name.length > 48 ? `${name.slice(0, 46)}…` : name;
}

export default function OpsIndustryAudit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [industryId, setIndustryId] = useState('');
  const [state, setState] = useState('ALL');
  const [date, setDate] = useState(todayISOInBRT());
  const [includeJustified, setIncludeJustified] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AuditStatus>('ALL');

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

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ops', 'industry-audit', industryId, apiState, date, includeJustified],
    queryFn: () =>
      supervisorService.getOpsIndustryAudit({
        industryId,
        state: apiState,
        date,
        includeJustified,
      }),
    enabled: !!industryId,
  });

  const rows = useMemo(() => {
    const list = data?.rows || [];
    if (statusFilter === 'ALL') return list;
    return list.filter((r) => r.status === statusFilter);
  }, [data?.rows, statusFilter]);

  const selectedIndustry = sortedIndustries.find((i) => i.id === industryId);

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vistoria por indústria</h1>
          <p className="text-text-secondary text-sm mt-1">
            Escolha a indústria e veja exatamente quem{' '}
            <span className="text-error-400 font-semibold">não enviou foto</span> por loja no dia
            {user?.role === 'SUPERVISOR' ? ' (sua equipe)' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={!industryId || isFetching}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600/20 text-primary-400 border border-primary-600 hover:bg-primary-600/25 disabled:opacity-50"
        >
          Atualizar
        </button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-tertiary min-w-[220px] flex-1">
              Indústria *
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="px-3 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary text-sm"
              >
                <option value="">Selecione a indústria…</option>
                {sortedIndustries.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {(ind.abbreviation || ind.code) + ' — ' + ind.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              Data
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              Estado
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="px-3 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary text-sm"
              >
                <option value="ALL">Todos</option>
                {states.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-tertiary">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AuditStatus)}
                className="px-3 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary text-sm"
              >
                <option value="ALL">Todos pendentes</option>
                <option value="sem_foto">Só sem foto</option>
                <option value="sem_visita">Só sem visita</option>
                <option value="justificado">Só justificados</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary pb-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeJustified}
                onChange={(e) => setIncludeJustified(e.target.checked)}
                className="rounded border-dark-border"
              />
              Incluir justificativas do app
            </label>
          </div>
        </CardContent>
      </Card>

      {!industryId && (
        <Card>
          <CardContent className="py-10 text-center text-text-tertiary text-sm">
            Selecione uma indústria para ver quem cobrar hoje.
          </CardContent>
        </Card>
      )}

      {industryId && isLoading && (
        <Card>
          <CardContent className="py-8 text-text-secondary">Carregando vistoria…</CardContent>
        </Card>
      )}

      {industryId && isError && (
        <Card className="border border-error-500/30">
          <CardContent className="py-6 text-error-400 font-semibold">
            Falha ao carregar a vistoria. Verifique se o backend está atualizado.
          </CardContent>
        </Card>
      )}

      {industryId && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'A cobrar', value: data.stats.pending, tone: 'text-error-400' },
              { label: 'Sem foto', value: data.stats.semFoto, tone: 'text-error-400' },
              { label: 'Sem visita', value: data.stats.semVisita, tone: 'text-error-400' },
              { label: 'Justificado', value: data.stats.justificado, tone: 'text-warning-400' },
              { label: 'Já enviaram', value: data.stats.feitos, tone: 'text-success-400' },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="py-4">
                  <div className="text-text-tertiary text-xs uppercase tracking-wider">{kpi.label}</div>
                  <div className={`text-2xl font-bold mt-1 ${kpi.tone}`}>{kpi.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-text-primary font-bold">
                  {(selectedIndustry?.abbreviation || data.industry.abbreviation || data.industry.code) +
                    ' — ' +
                    (selectedIndustry?.name || data.industry.name)}
                </div>
                <div className="text-text-secondary text-xs mt-1">
                  Pendências em {date} · quem já enviou foto não aparece na lista
                </div>
              </div>
              <Badge variant={rows.length > 0 ? 'error' : 'success'}>
                {rows.length} pendência{rows.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="px-5 py-10 text-center text-success-400 text-sm font-medium">
                  Nenhuma pendência para esta indústria neste dia.
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-dark-backgroundSecondary border-b border-dark-border">
                      <tr className="text-text-secondary">
                        <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                        <th className="text-left px-4 py-3 font-semibold">Loja</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Detalhe</th>
                        <th className="text-left px-4 py-3 font-semibold">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={`${r.promoter.id}:${r.store.id}`}
                          className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer"
                          onClick={() => navigate(`/promoters/${r.promoter.id}?date=${date}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="text-text-primary font-semibold">{r.promoter.name}</div>
                            <div className="text-text-secondary text-xs">{r.promoter.state ?? '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-text-primary">{shortStoreName(r.store.name)}</div>
                            {r.store.state && (
                              <div className="text-text-tertiary text-xs">{r.store.state}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">{statusBadge(r.status)}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs max-w-[280px]">
                            {r.status === 'justificado' ? (
                              <span>
                                {r.missReasonLabel || 'Justificado'}
                                {r.missNote ? ` — ${r.missNote}` : ''}
                              </span>
                            ) : r.status === 'sem_visita' ? (
                              <span className="text-error-400">Na rota, sem check-in no dia</span>
                            ) : (
                              <span className="text-error-400">Visitou e não enviou foto desta indústria</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-text-primary">{formatTimeBR(r.checkInAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
