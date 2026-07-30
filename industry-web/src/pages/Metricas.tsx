import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { industryOwnerService } from '../services/industryOwnerService';

export default function Metricas() {
  const { industryId, industry } = useAuth();
  const { filters } = useFilters();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-metrics', industryId, filters.state],
    queryFn: () =>
      industryOwnerService.getMetrics(industryId!, { state: filters.state || undefined }),
    enabled: !!industryId,
  });

  function exportPdfClient() {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Métricas — ${industry?.name || 'Indústria'}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${data.startDate} a ${data.endDate}`, 14, 26);
    doc.text(
      `Fotos: ${data.summary.photos} · Misses: ${data.summary.misses} · Taxa: ${data.summary.executionRate}%`,
      14,
      32
    );
    let y = 42;
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 14, y);
    doc.text('Fotos', 70, y);
    doc.text('Misses', 110, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    for (const s of data.series || []) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(s.date), 14, y);
      doc.text(String(s.photos), 70, y);
      doc.text(String(s.misses), 110, y);
      y += 5;
    }
    doc.save(`metricas-${industry?.code || 'industria'}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Métricas</h2>
          <p className="text-sm text-ink-700">
            Tendência de execução
            {data ? ` · ${data.startDate} → ${data.endDate}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={exportPdfClient}
          disabled={!data}
          className="px-3 py-1.5 text-sm rounded bg-ink-900 text-sand-50 disabled:opacity-50"
        >
          Exportar PDF
        </button>
      </div>

      {isLoading && <p>Carregando…</p>}
      {isError && <p className="text-accent-600">Erro ao carregar métricas.</p>}

      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Fotos', data.summary.photos],
            ['Misses', data.summary.misses],
            ['Taxa execução', `${data.summary.executionRate}%`],
            ['Pendentes hoje', data.summary.todayPending],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white border border-ink-100 rounded-xl p-4">
              <p className="text-xs text-ink-700 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-display font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {data?.series && (
        <div className="bg-white border border-ink-100 rounded-xl p-4 h-72">
          <p className="text-sm font-medium mb-2">Fotos e misses por dia</p>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6F2EF" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="photos" stroke="#24564C" fill="#24564C33" name="Fotos" />
              <Area type="monotone" dataKey="misses" stroke="#C45C26" fill="#C45C2633" name="Misses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.byState && data.byState.length > 0 && (
        <div className="bg-white border border-ink-100 rounded-xl p-4 h-72">
          <p className="text-sm font-medium mb-2">Fotos por UF</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data.byState}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6F2EF" />
              <XAxis dataKey="state" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="photos" fill="#24564C" name="Fotos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
