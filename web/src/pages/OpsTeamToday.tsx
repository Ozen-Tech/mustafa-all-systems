import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent } from '../components/ui/Card';
import { supervisorService } from '../services/supervisorService';
import { useAuth } from '../context/AuthContext';
import TeamSummaryCards from '../components/ops/TeamSummaryCards';
import PromotersTable from '../components/ops/PromotersTable';
import NonSendersPanel from '../components/ops/NonSendersPanel';
import OpsStrategyCard from '../components/ops/OpsStrategyCard';

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

export default function OpsTeamToday() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR';
  const [state, setState] = useState<string>('ALL');
  const [date, setDate] = useState<string>(todayISOInBRT());

  const { data: statesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });
  const states: string[] = statesData?.states || [];

  const apiState = useMemo(() => (state === 'ALL' ? undefined : state), [state]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ops', 'team-today', apiState, date],
    queryFn: () => supervisorService.getOpsTeamToday({ state: apiState, date }),
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">EQUIPE HOJE</h1>
          <p className="text-text-secondary text-sm mt-1">
            {isSupervisor
              ? 'Visão operacional dos promotores da sua equipe'
              : 'Operação + cobrança + qualidade de evidências'}{' '}
            (prazo até <span className="text-text-primary font-semibold">20:00 BRT</span>)
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
            <div className="text-text-secondary">Carregando visão operacional...</div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-error-500/30">
          <CardContent>
            <div className="text-error-500 font-semibold">Falha ao carregar a visão de hoje.</div>
            <div className="text-text-secondary text-sm mt-2">Verifique a API e tente novamente.</div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <TeamSummaryCards summary={data.summary} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <PromotersTable
                rows={data.rows}
                onOpenPromoter={(id) => navigate(`/ops/promoters/${id}/day?date=${date}`)}
              />
              <OpsStrategyCard />
            </div>
            <div className="space-y-6">
              <NonSendersPanel items={data.nonSenders} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

