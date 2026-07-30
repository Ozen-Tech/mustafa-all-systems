import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

export default function Home() {
  const { industryId, industry } = useAuth();
  const { filters } = useFilters();

  const { data: audit, isLoading } = useQuery({
    queryKey: ['owner-audit-home', industryId, filters.date, filters.state],
    queryFn: () =>
      industryOwnerService.getAudit(industryId!, {
        date: filters.date,
        state: filters.state || undefined,
      }),
    enabled: !!industryId,
  });

  const { data: metrics } = useQuery({
    queryKey: ['owner-metrics-home', industryId, filters.state],
    queryFn: () =>
      industryOwnerService.getMetrics(industryId!, { state: filters.state || undefined }),
    enabled: !!industryId,
  });

  const stats = audit?.stats;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-2xl font-bold text-ink-950">
          {industry?.name}
        </h2>
        <p className="text-ink-700 mt-1">
          Visão nacional da execução em loja — filtros acima aplicam em todas as telas.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Feitos hoje', value: stats?.feitos ?? '—' },
          { label: 'Sem foto', value: stats?.semFoto ?? '—' },
          { label: 'Sem visita', value: stats?.semVisita ?? '—' },
          { label: 'Justificados', value: stats?.justificado ?? '—' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-ink-100 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-ink-700">{c.label}</p>
            <p className="text-3xl font-display font-bold mt-1 text-ink-950">
              {isLoading ? '…' : c.value}
            </p>
          </div>
        ))}
      </section>

      {metrics?.summary && (
        <section className="bg-ink-900 text-sand-50 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-ink-100/70">Últimos 14 dias</p>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-ink-100/80">Fotos</p>
              <p className="text-2xl font-bold">{metrics.summary.photos}</p>
            </div>
            <div>
              <p className="text-sm text-ink-100/80">Misses</p>
              <p className="text-2xl font-bold">{metrics.summary.misses}</p>
            </div>
            <div>
              <p className="text-sm text-ink-100/80">Taxa execução</p>
              <p className="text-2xl font-bold">{metrics.summary.executionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-ink-100/80">Lojas c/ foto</p>
              <p className="text-2xl font-bold">{metrics.summary.storesWithPhotos}</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-3">
        {[
          { to: '/vistoria', title: 'Vistoria do dia', desc: 'Quem não enviou foto' },
          { to: '/fotos', title: 'Galeria', desc: 'Evidências por loja e promotor' },
          { to: '/cobertura', title: 'Cobertura', desc: 'Lojas e UFs atendidas' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="block bg-white border border-ink-100 rounded-xl p-5 hover:border-accent-500 transition-colors"
          >
            <h3 className="font-semibold text-ink-950">{item.title}</h3>
            <p className="text-sm text-ink-700 mt-1">{item.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
