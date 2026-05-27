import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Link } from 'react-router-dom';

export default function AdminTodayPromoterOverview() {
  const [selectedState, setSelectedState] = useState<string>('');
  const [search, setSearch] = useState('');
  const [openThresholdHours, setOpenThresholdHours] = useState<number>(4);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'today-overview'],
    queryFn: () => adminService.getAdminTodayOverview(),
  });

  const states = data?.states || [];
  const promoters = data?.promoters || [];

  const activeState = selectedState || (states.length > 0 ? states[0].state : '');

  const { data: openVisitsData, isLoading: openVisitsLoading } = useQuery({
    queryKey: ['admin', 'open-visits', activeState],
    queryFn: () => adminService.listOpenVisits(activeState || undefined),
    enabled: Boolean(activeState),
  });

  const forceCheckout = useMutation({
    mutationFn: (visitId: string) => adminService.forceCheckoutVisit(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'today-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'open-visits'] });
    },
  });

  const filteredPromoters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promoters
      .filter((p) => (activeState ? (p.state || '—') === activeState : true))
      .filter((p) => {
        if (!q) return true;
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Priorizar alertas e visita aberta
        const aScore = (a.unjustifiedMissesToday > 0 ? 100 : 0) + (a.hasOpenVisit ? 10 : 0) + (a.noVisitToday ? 5 : 0);
        const bScore = (b.unjustifiedMissesToday > 0 ? 100 : 0) + (b.hasOpenVisit ? 10 : 0) + (b.noVisitToday ? 5 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return a.name.localeCompare(b.name);
      });
  }, [promoters, activeState, search]);

  const openVisits = useMemo(() => {
    const now = Date.now();
    const raw = (openVisitsData?.visits || []).map((v) => ({
      visitId: v.id,
      checkInAt: v.checkInAt,
      promoterId: v.promoter.id,
      promoterName: v.promoter.name,
      promoterEmail: v.promoter.email,
      state: v.promoter.state,
      storeId: v.store.id,
      storeName: v.store.name,
      openForMs: Math.max(0, now - new Date(v.checkInAt).getTime()),
    }));

    raw.sort((a, b) => b.openForMs - a.openForMs);

    const minMs = openThresholdHours > 0 ? openThresholdHours * 60 * 60 * 1000 : 0;
    return minMs ? raw.filter((x) => x.openForMs >= minMs) : raw;
  }, [openVisitsData, openThresholdHours]);

  const formatDuration = (ms: number) => {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h <= 0) return `${m}min`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Situação de hoje (Promotores)</h1>
          <p className="text-sm text-text-secondary mt-1">
            Visão rápida por UF: visita aberta, sem visita hoje e alertas de falta sem justificativa.
          </p>
        </div>
        <Link to="/admin/promoter-correcoes">
          <Button variant="outline" size="sm">Correções promotor</Button>
        </Link>
      </div>

      {/* Lojas em aberto */}
      <Card className="border-dark-border">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Lojas em aberto</div>
              <div className="text-xs text-text-tertiary">
                Visitas em aberto (qualquer dia), por UF. Útil quando o promotor esquece de fechar no app.
              </div>
            </div>
            <Badge variant={openVisits.length > 0 ? 'warning' : 'success'}>
              {openVisits.length} em aberto
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span>Mostrar apenas abertas há:</span>
            <div className="flex gap-2">
              {[0, 2, 4, 8, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setOpenThresholdHours(h)}
                  className={`px-2 py-1 rounded-lg border transition-colors ${
                    openThresholdHours === h
                      ? 'border-primary-600 bg-primary-600/10 text-text-primary'
                      : 'border-dark-border bg-dark-card hover:border-primary-500/40'
                  }`}
                >
                  {h === 0 ? 'Tudo' : `${h}h+`}
                </button>
              ))}
            </div>
          </div>

          {openVisitsLoading ? (
            <div className="text-sm text-text-tertiary py-2">Carregando visitas em aberto...</div>
          ) : openVisits.length === 0 ? (
            <div className="text-sm text-text-tertiary py-2">Nenhuma visita em aberto na UF ativa.</div>
          ) : (
            <div className="space-y-2">
              {openVisits.map((it) => (
                <div
                  key={it.visitId}
                  className="rounded-xl border border-dark-border bg-dark-card px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-text-primary truncate">{it.promoterName}</div>
                    <div className="text-xs text-text-tertiary truncate">{it.promoterEmail}</div>
                    <div className="mt-1 text-xs text-text-tertiary flex flex-wrap gap-x-4 gap-y-1">
                      <span>UF: {it.state || '—'}</span>
                      <span>Check-in: {new Date(it.checkInAt).toLocaleString('pt-BR')}</span>
                      <span>Em aberto: {formatDuration(it.openForMs)}</span>
                      <span>Loja: {it.storeName || it.storeId.slice(0, 8) + '…'}</span>
                      <span>VisitID: {it.visitId.slice(0, 8)}…</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={forceCheckout.isPending}
                      onClick={() => {
                        const ok = window.confirm(
                          `Fechar visita em aberto agora?\n\nPromotor: ${it.promoterName}\nLoja: ${it.storeName || it.storeId}\nVisitID: ${it.visitId}`
                        );
                        if (!ok) return;
                        forceCheckout.mutate(it.visitId);
                      }}
                    >
                      {forceCheckout.isPending ? 'Fechando...' : 'Fechar visita'}
                    </Button>
                    <Link to={`/promoters/${it.promoterId}`}>
                      <Button variant="ghost" size="sm">Detalhes</Button>
                    </Link>
                  </div>
                </div>
              ))}
              {forceCheckout.isError && (
                <div className="text-xs text-red-300">
                  Não foi possível fechar a visita. Tente novamente (ou confira se ela já foi fechada no app).
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards por UF */}
      <div className="flex gap-3 overflow-x-auto scrollbar-dark pb-2">
        {states.map((st) => {
          const isActive = (st.state || '—') === activeState;
          return (
            <button
              key={st.state}
              type="button"
              onClick={() => setSelectedState(st.state)}
              className={`min-w-[220px] text-left rounded-xl border px-4 py-3 transition-colors ${
                isActive
                  ? 'border-primary-600 bg-primary-600/10'
                  : 'border-dark-border bg-dark-card hover:border-primary-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-text-primary">
                  {st.state || '—'}
                </div>
                {st.unjustifiedMisses > 0 ? (
                  <Badge variant="error">Alerta</Badge>
                ) : (
                  <Badge variant="success">OK</Badge>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-text-tertiary">
                <div>
                  <div className="text-text-secondary font-semibold">{st.promotersTotal}</div>
                  <div>Total</div>
                </div>
                <div>
                  <div className="text-text-secondary font-semibold">{st.openVisits}</div>
                  <div>Abertas</div>
                </div>
                <div>
                  <div className="text-text-secondary font-semibold">{st.noVisitToday}</div>
                  <div>Sem visita</div>
                </div>
              </div>
              {st.unjustifiedMisses > 0 && (
                <div className="mt-2 text-xs text-red-300">
                  {st.unjustifiedMisses} falta(s) sem justificativa
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Busca e lista */}
      <Card className="border-dark-border">
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm text-text-secondary">
              UF ativa: <span className="text-text-primary font-semibold">{activeState || '—'}</span>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar promotor (nome/email)..."
              className="sm:max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPromoters.length === 0 ? (
            <div className="py-10 text-center text-text-tertiary text-sm">
              Nenhum promotor encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPromoters.map((p) => (
                <div key={p.id} className="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary truncate">{p.name}</div>
                      <div className="text-xs text-text-tertiary truncate">{p.email}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.unjustifiedMissesToday > 0 && <Badge variant="error">Alerta</Badge>}
                      {p.hasOpenVisit ? <Badge variant="warning">Visita aberta</Badge> : <Badge variant="gray">Sem aberta</Badge>}
                      {p.noVisitToday && <Badge variant="gray">Sem visita hoje</Badge>}
                      <Badge variant="primary">{p.visitsToday} visita(s)</Badge>
                      <Link to={`/promoters/${p.id}`}>
                        <Button variant="ghost" size="sm">Detalhes</Button>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-tertiary flex flex-wrap gap-x-4 gap-y-1">
                    <span>Última atividade: {p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleTimeString('pt-BR') : '—'}</span>
                    {p.openVisit && (
                      <span>
                        Aberta desde {new Date(p.openVisit.checkInAt).toLocaleTimeString('pt-BR')} •{' '}
                        {p.openVisit.storeName ? `Loja: ${p.openVisit.storeName}` : `StoreID: ${p.openVisit.storeId.slice(0, 8)}…`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

