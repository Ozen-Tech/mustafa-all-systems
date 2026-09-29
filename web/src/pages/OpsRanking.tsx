import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  SKIP_REASON_LABELS,
  StoreDaySkipReason,
  supervisorService,
  TeamRankingEntry,
} from '../services/supervisorService';

const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MEDALS = ['🥇', '🥈', '🥉'];

function todayISOInBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00-03:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function formatDayMonth(dateISO: string): string {
  const [, m, d] = dateISO.split('-');
  return `${d}/${m}`;
}

function DailyBars({ entry, maxDayPoints, today }: { entry: TeamRankingEntry; maxDayPoints: number; today: string }) {
  return (
    <div className="flex items-end gap-1 h-9">
      {entry.byDay.map((d, i) => {
        const future = d.date > today;
        const h = maxDayPoints > 0 ? Math.max(3, Math.round((d.points / maxDayPoints) * 32)) : 3;
        const color = future
          ? 'bg-dark-border/40'
          : d.closed
            ? 'bg-success-500'
            : d.points > 0
              ? 'bg-warning-500'
              : 'bg-error-500/50';
        return (
          <div
            key={d.date}
            className="flex flex-col items-center gap-0.5"
            title={`${WEEKDAY_SHORT[i]} ${formatDayMonth(d.date)} · ${d.points} pts · ${d.storesDone} loja(s)${
              d.skipped ? ` · ${d.skipped} não feita(s)` : ''
            }${d.closed ? ' · dia fechado' : ''}`}
          >
            <div className={`w-3 rounded-sm ${color}`} style={{ height: future ? 3 : h }} />
            <span className="text-[9px] text-text-tertiary leading-none">{WEEKDAY_SHORT[i][0]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OpsRanking() {
  const navigate = useNavigate();
  const [state, setState] = useState<string>('ALL');
  const [refDate, setRefDate] = useState<string>(todayISOInBRT());

  const { data: statesData } = useQuery({
    queryKey: ['supervisor', 'my-states'],
    queryFn: () => supervisorService.getMyStates(),
  });
  const states: string[] = statesData?.states || [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ops', 'ranking', state, refDate],
    queryFn: () =>
      supervisorService.getTeamRanking({ state: state === 'ALL' ? undefined : state, date: refDate }),
  });

  const isCurrentWeek = data ? data.today >= data.weekStart && data.today <= data.weekEnd : true;
  const leaderPoints = data?.entries[0]?.points || 0;
  const maxDayPoints = useMemo(
    () => Math.max(0, ...(data?.entries.flatMap((e) => e.byDay.map((d) => d.points)) || [0])),
    [data]
  );

  const skipsByReason = useMemo(() => {
    const counts = new Map<StoreDaySkipReason, number>();
    for (const s of data?.skips || []) counts.set(s.reason, (counts.get(s.reason) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ranking da Equipe</h1>
          <p className="text-text-secondary text-sm mt-1">
            Pontos das missões do app (lojas, indústrias, prazo e fotos) · semana de segunda a domingo
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
          <div className="flex items-center rounded-lg border border-dark-border bg-dark-card overflow-hidden">
            <button
              onClick={() => setRefDate((d) => shiftISO(d, -7))}
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-dark-cardElevated"
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <span className="px-3 py-2 text-sm text-text-primary tabular-nums border-x border-dark-border">
              {data ? `${formatDayMonth(data.weekStart)} – ${formatDayMonth(data.weekEnd)}` : '—'}
            </span>
            <button
              onClick={() => setRefDate((d) => shiftISO(d, 7))}
              disabled={isCurrentWeek}
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-dark-cardElevated disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Próxima semana"
            >
              ›
            </button>
          </div>
          {!isCurrentWeek && (
            <button
              onClick={() => setRefDate(todayISOInBRT())}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-primary-600/20 text-primary-400 border border-primary-600 hover:bg-primary-600/25"
            >
              Semana atual
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg text-sm text-text-secondary border border-dark-border hover:text-text-primary"
          >
            Atualizar
          </button>
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent>
            <div className="text-text-secondary">Carregando ranking...</div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border border-error-500/30">
          <CardContent>
            <div className="text-error-500 font-semibold">Falha ao carregar o ranking.</div>
            <div className="text-text-secondary text-sm mt-2">Verifique a API e tente novamente.</div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border border-accent-500/40 bg-gradient-to-br from-accent-500/10 to-dark-card">
              <CardContent className="p-5">
                <div className="text-text-secondary text-xs font-semibold uppercase tracking-wide">Líder</div>
                <div className="mt-2 text-lg font-bold text-text-primary truncate">
                  {data.summary.leader ? `🥇 ${data.summary.leader.name}` : 'Ninguém pontuou ainda'}
                </div>
                {data.summary.leader && (
                  <div className="text-accent-400 text-sm font-semibold">{data.summary.leader.points} pts</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                  Média da equipe
                </div>
                <div className="mt-2 text-2xl font-bold text-text-primary">{data.summary.averagePoints} pts</div>
                <div className="text-text-tertiary text-xs">{data.summary.promoters} promotores</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                  Dias fechados
                </div>
                <div className="mt-2 text-2xl font-bold text-success-500">{data.summary.daysClosed}</div>
                <div className="text-text-tertiary text-xs">rota inteira resolvida no dia</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-text-secondary text-xs font-semibold uppercase tracking-wide">
                  Pesquisas de preço
                </div>
                <div className="mt-2 text-2xl font-bold text-text-primary">{data.summary.priceResearch}</div>
                <div className="text-text-tertiary text-xs">registradas na semana</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-text-primary font-bold">Classificação</div>
                  <div className="text-text-secondary text-xs mt-1">
                    Barras por dia: <span className="text-success-500">dia fechado</span> ·{' '}
                    <span className="text-warning-500">pontuou</span> ·{' '}
                    <span className="text-error-500">sem pontos</span>
                  </div>
                </div>
                <Badge variant="gray">{data.entries.length} promotores</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {data.entries.length === 0 ? (
                  <div className="p-6 text-text-secondary text-sm">Nenhum promotor na sua equipe.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-dark-backgroundSecondary border-b border-dark-border">
                        <tr className="text-text-secondary">
                          <th className="text-left px-4 py-3 font-semibold w-12">#</th>
                          <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                          <th className="text-left px-4 py-3 font-semibold min-w-[180px]">Pontos</th>
                          <th className="text-left px-4 py-3 font-semibold">Semana</th>
                          <th className="text-right px-4 py-3 font-semibold">Lojas</th>
                          <th className="text-right px-4 py-3 font-semibold">Não feitas</th>
                          <th className="text-right px-4 py-3 font-semibold">Pesquisas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.entries.map((e) => {
                          const pct = leaderPoints > 0 ? Math.round((e.points / leaderPoints) * 100) : 0;
                          return (
                            <tr
                              key={e.promoterId}
                              onClick={() => navigate(`/promoters/${e.promoterId}`)}
                              className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer"
                            >
                              <td className="px-4 py-3 text-text-primary font-bold tabular-nums">
                                {e.points > 0 && e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-text-primary font-semibold">{e.name}</div>
                                <div className="text-text-tertiary text-xs">
                                  {e.state ?? '—'} · {e.daysClosed} dia(s) fechado(s)
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-dark-backgroundSecondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${e.rank === 1 && e.points > 0 ? 'bg-accent-500' : 'bg-primary-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-text-primary font-bold tabular-nums w-14 text-right">
                                    {e.points}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <DailyBars entry={e} maxDayPoints={maxDayPoints} today={data.today} />
                              </td>
                              <td className="px-4 py-3 text-right text-text-primary tabular-nums">{e.storesDone}</td>
                              <td
                                className={`px-4 py-3 text-right tabular-nums ${
                                  e.skipped > 0 ? 'text-warning-500 font-semibold' : 'text-text-tertiary'
                                }`}
                              >
                                {e.skipped}
                              </td>
                              <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                                {e.priceResearchCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-warning-500/30">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-bold">Lojas não feitas</div>
                  <div className="text-text-secondary text-xs mt-1">Marcadas no app como “Não vou fazer hoje”</div>
                </div>
                <Badge variant={data.skips.length ? 'warning' : 'gray'}>{data.skips.length}</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {data.skips.length === 0 ? (
                  <div className="text-text-secondary text-sm">Nenhuma loja pulada nesta semana.</div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {skipsByReason.map(([reason, count]) => (
                        <span
                          key={reason}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-500/15 text-warning-500 border border-warning-500/40"
                        >
                          {SKIP_REASON_LABELS[reason]} · {count}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                      {data.skips.map((s, i) => (
                        <div
                          key={`${s.promoterId}-${s.store.id}-${s.date}-${i}`}
                          className="rounded-lg border border-dark-border bg-dark-backgroundSecondary px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-primary text-sm font-semibold truncate">{s.store.name}</span>
                            <span className="text-text-tertiary text-xs shrink-0">{formatDayMonth(s.date)}</span>
                          </div>
                          <div className="text-text-secondary text-xs mt-0.5">
                            {s.promoterName} · <span className="text-warning-500">{SKIP_REASON_LABELS[s.reason]}</span>
                          </div>
                          {s.note && <div className="text-text-tertiary text-xs mt-1 italic">“{s.note}”</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="text-text-tertiary text-xs">
            Pontuação por dia: 20 por loja concluída · 20 por indústrias completas · 15 por evidência até 20:00 · 10 por
            cota de fotos.
          </div>
        </>
      )}
    </div>
  );
}
