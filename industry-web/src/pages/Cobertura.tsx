import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

export default function Cobertura() {
  const { industryId } = useAuth();
  const { filters } = useFilters();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-coverage', industryId, filters.state],
    queryFn: () =>
      industryOwnerService.getCoverage(industryId!, { state: filters.state || undefined }),
    enabled: !!industryId,
  });

  async function exportFmt(format: 'csv' | 'xlsx' | 'pdf') {
    if (!industryId) return;
    setExporting(true);
    try {
      await industryOwnerService.downloadExport(industryId, {
        format,
        type: 'coverage',
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
          <h2 className="font-display text-2xl font-bold">Cobertura</h2>
          <p className="text-sm text-ink-700">
            Lojas com a indústria no catálogo · últimos 30 dias
            {data?.summary
              ? ` · ${data.summary.withPhoto}/${data.summary.stores} com foto`
              : ''}
          </p>
        </div>
        <div className="flex gap-2">
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

      {isLoading && <p>Carregando…</p>}
      {isError && <p className="text-accent-600">Erro ao carregar cobertura.</p>}

      {data?.byState && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {data.byState.map((s: any) => (
            <div key={s.state} className="bg-white border border-ink-100 rounded-xl p-3">
              <p className="font-semibold">{s.state}</p>
              <p className="text-xs text-ink-700 mt-1">
                {s.withPhoto}/{s.stores} com foto · {s.noActivity} sem atividade
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-ink-100 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-ink-700">
              <th className="px-3 py-2">Loja</th>
              <th className="px-3 py-2">UF</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Fotos</th>
              <th className="px-3 py-2">Visitas</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((r: any) => (
              <tr key={r.store.id} className="border-b border-ink-50">
                <td className="px-3 py-2">{r.store.name}</td>
                <td className="px-3 py-2">{r.store.state || '—'}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.photoCount}</td>
                <td className="px-3 py-2">{r.visitCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
