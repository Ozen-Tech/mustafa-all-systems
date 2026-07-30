import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

type Status = 'ALL' | 'sem_foto' | 'justificado' | 'sem_visita';

function badge(status: string) {
  if (status === 'sem_foto') return 'bg-red-100 text-red-800';
  if (status === 'sem_visita') return 'bg-orange-100 text-orange-800';
  return 'bg-amber-100 text-amber-800';
}

export default function Vistoria() {
  const { industryId } = useAuth();
  const { filters } = useFilters();
  const [statusFilter, setStatusFilter] = useState<Status>('ALL');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['owner-audit', industryId, filters.date, filters.state],
    queryFn: () =>
      industryOwnerService.getAudit(industryId!, {
        date: filters.date,
        state: filters.state || undefined,
      }),
    enabled: !!industryId,
  });

  const rows = useMemo(() => {
    const list = data?.rows || [];
    if (statusFilter === 'ALL') return list;
    return list.filter((r: any) => r.status === statusFilter);
  }, [data?.rows, statusFilter]);

  async function exportFmt(format: 'csv' | 'xlsx' | 'pdf') {
    if (!industryId) return;
    setExporting(true);
    try {
      await industryOwnerService.downloadExport(industryId, {
        format,
        type: 'audit',
        date: filters.date,
        state: filters.state || undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Vistoria</h2>
          <p className="text-sm text-ink-700">
            Pendências de {filters.date}
            {data?.stats ? ` · ${data.stats.pending} pendentes · ${data.stats.feitos} feitos` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm rounded border border-ink-100 bg-white"
          >
            {isFetching ? 'Atualizando…' : 'Atualizar'}
          </button>
          {(['csv', 'xlsx', 'pdf'] as const).map((f) => (
            <button
              key={f}
              type="button"
              disabled={exporting}
              onClick={() => exportFmt(f)}
              className="px-3 py-1.5 text-sm rounded bg-ink-900 text-sand-50 disabled:opacity-50 uppercase"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'sem_foto', 'sem_visita', 'justificado'] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusFilter === s ? 'bg-accent-500 text-white' : 'bg-white border border-ink-100'
            }`}
          >
            {s === 'ALL' ? 'Todos' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading && <p>Carregando…</p>}
      {isError && <p className="text-accent-600">Erro ao carregar vistoria.</p>}

      <div className="overflow-x-auto bg-white border border-ink-100 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-ink-700">
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Promotor</th>
              <th className="px-3 py-2">UF</th>
              <th className="px-3 py-2">Loja</th>
              <th className="px-3 py-2">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={`${r.promoter.id}-${r.store.id}-${i}`} className="border-b border-ink-50">
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">{r.promoter.name}</td>
                <td className="px-3 py-2">{r.promoter.state || r.store.state || '—'}</td>
                <td className="px-3 py-2">{r.store.name}</td>
                <td className="px-3 py-2 text-ink-700">
                  {r.missReasonLabel || '—'}
                  {r.missNote ? ` · ${r.missNote}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !isLoading && (
          <p className="p-6 text-ink-700">Nenhuma pendência com os filtros atuais.</p>
        )}
      </div>
    </div>
  );
}
