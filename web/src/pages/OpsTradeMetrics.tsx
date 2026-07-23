import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent } from '../components/ui/Card';
import { supervisorService } from '../services/supervisorService';
import TradeMetricsCards from '../components/ops/TradeMetricsCards';
import TradeImpactRanking from '../components/ops/TradeImpactRanking';
import CriticalPromotersPanel from '../components/ops/CriticalPromotersPanel';
import WhatToMeasurePanel from '../components/ops/WhatToMeasurePanel';

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

export default function OpsTradeMetrics() {
  const navigate = useNavigate();
  const [state, setState] = useState<string>('ALL');
  const [date, setDate] = useState<string>(todayISOInBRT());

  const { data: statesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });
  const states: string[] = statesData?.states || [];

  const apiState = useMemo(() => (state === 'ALL' ? undefined : state), [state]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ops', 'trade-metrics', apiState, date],
    queryFn: () => supervisorService.getOpsTradeMetrics({ state: apiState, date }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">MÉTRICAS TRADE</h1>
          <p className="text-text-secondary text-sm mt-1">
            Indicadores de execução e impacto (v1: auditoria de preço + evidências)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="bg-dark-card border border-dark-border text-text-primary rounded-lg px-3 py-2 text-sm"
          >
            <option value="ALL">Todos</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-dark-card border border-dark-border text-text-primary rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600/20 text-primary-400 border border-primary-600 hover:bg-primary-600/25"
          >
            Atualizar
          </button>
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent>
            <div className="text-text-secondary">Carregando métricas de trade...</div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-error-500/30">
          <CardContent>
            <div className="text-error-500 font-semibold">Falha ao carregar métricas.</div>
            <div className="text-text-secondary text-sm mt-2">Verifique a API e tente novamente.</div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <TradeMetricsCards cards={data.cards} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <TradeImpactRanking
                items={data.ranking}
                onOpenPromoter={(id) => navigate(`/promoters/${id}?date=${date}`)}
              />
            </div>
            <div className="space-y-6">
              <CriticalPromotersPanel items={data.riskPromoters} />
              <WhatToMeasurePanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

