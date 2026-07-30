import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

export default function FiltersBar() {
  const { industryId } = useAuth();
  const { filters, setFilters } = useFilters();

  const { data } = useQuery({
    queryKey: ['owner-filters', industryId, filters.state],
    queryFn: () => industryOwnerService.getFilters(industryId!, filters.state || undefined),
    enabled: !!industryId,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white/70 border border-ink-100 rounded-xl p-3 shadow-sm">
      <label className="text-xs text-ink-700 flex flex-col gap-1">
        UF
        <select
          value={filters.state}
          onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value, storeId: '', promoterId: '' }))}
          className="rounded-md border border-ink-100 bg-sand-50 px-2 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {(data?.states || []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-700 flex flex-col gap-1">
        Loja
        <select
          value={filters.storeId}
          onChange={(e) => setFilters((f) => ({ ...f, storeId: e.target.value }))}
          className="rounded-md border border-ink-100 bg-sand-50 px-2 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          {(data?.stores || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-700 flex flex-col gap-1">
        Promotor
        <select
          value={filters.promoterId}
          onChange={(e) => setFilters((f) => ({ ...f, promoterId: e.target.value }))}
          className="rounded-md border border-ink-100 bg-sand-50 px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {(data?.promoters || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-700 flex flex-col gap-1">
        Data (vistoria)
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          className="rounded-md border border-ink-100 bg-sand-50 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs text-ink-700 flex flex-col gap-1">
        Mês fotos (MM/AAAA)
        <input
          type="text"
          placeholder="07/2026"
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          className="rounded-md border border-ink-100 bg-sand-50 px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}
