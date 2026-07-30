import React, { createContext, useContext, useMemo, useState } from 'react';

function todayISO(): string {
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

interface Filters {
  state: string;
  storeId: string;
  promoterId: string;
  date: string;
  month: string;
}

interface FilterCtx {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

const FilterContext = createContext<FilterCtx | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>({
    state: '',
    storeId: '',
    promoterId: '',
    date: todayISO(),
    month: '',
  });

  const value = useMemo(() => ({ filters, setFilters }), [filters]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
