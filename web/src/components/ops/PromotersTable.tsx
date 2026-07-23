import React, { useMemo } from 'react';
import Badge from '../ui/Badge';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { formatPct, formatTimeBR } from './opsFormat';

type StoreStatus = 'feita' | 'em_execucao' | 'nao_feita';
type IndustryStatus = 'enviado' | 'pendente';

type IndustryChip = {
  id: string;
  code: string;
  name: string;
  abbreviation?: string | null;
  status: IndustryStatus;
  photoCount: number;
};

type StoreChip = {
  id: string;
  name: string;
  status: StoreStatus;
  executionPct: number | null;
  photoCount: number;
  industriesRequired: number;
  industriesCovered: number;
  pendingCount?: number;
  industries?: IndustryChip[];
  fromRoute?: boolean;
  visited?: boolean;
};

type Row = {
  promoter: { id: string; name: string; email: string; state: string | null };
  deliveryStatus: 'enviado' | 'sem_envio';
  deadlineStatus: 'no_prazo' | 'fora_do_prazo' | 'sem_envio';
  firstSentAt: string | null;
  photoCount: number;
  executionPct: number | null;
  statusLabel: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' | 'Sem envio';
  statusBucket: string;
  storesCount?: number;
  storesFeitas?: number;
  storesEmExecucao?: number;
  storesNaoFeitas?: number;
  pendingIndustriesTotal?: number;
  stores?: StoreChip[];
  // Payload legado (1 linha / indústria)
  store?: { id: string; name: string; address: string } | null;
  industry?: { id: string; name: string; code: string; abbreviation?: string | null } | null;
};

function statusBadgeVariant(label: Row['statusLabel']): 'success' | 'primary' | 'warning' | 'error' | 'gray' {
  if (label === 'Excelente') return 'success';
  if (label === 'Bom') return 'primary';
  if (label === 'Atenção') return 'warning';
  if (label === 'Crítico') return 'error';
  return 'gray';
}

function storeBorderClass(status: StoreStatus): string {
  if (status === 'feita') return 'border-success-500/40';
  if (status === 'em_execucao') return 'border-warning-500/40';
  return 'border-error-500/40';
}

function storeDotClass(status: StoreStatus): string {
  if (status === 'feita') return 'bg-success-400';
  if (status === 'em_execucao') return 'bg-warning-400';
  return 'bg-error-400';
}

function industryChipClass(status: IndustryStatus): string {
  if (status === 'enviado') {
    return 'bg-success-500/15 text-success-400 border-success-500/40';
  }
  return 'bg-error-500/15 text-error-400 border-error-500/40';
}

function shortStoreName(name: string): string {
  const parts = name.split(/\s*[–—-]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const first = parts[0];
    if (last.length <= 28) return `${first} · ${last}`;
  }
  return name.length > 40 ? `${name.slice(0, 38)}…` : name;
}

function industryLabel(ind: IndustryChip): string {
  return (ind.abbreviation || ind.code || ind.name || '?').toString();
}

/** Normaliza payload legado (indústria x loja) → 1 linha por promotor com industries[]. */
function normalizePromoterRows(rows: Row[]): Row[] {
  // API nova: já veio 1 linha/promotor com stores[]
  if (rows.length > 0 && Array.isArray(rows[0].stores) && !rows[0].industry) {
    return rows.map((r) => {
      const stores = (r.stores || []).map((s) => {
        const industries = s.industries || [];
        const pendingCount =
          s.pendingCount ?? industries.filter((i) => i.status === 'pendente').length;
        return { ...s, industries, pendingCount };
      });
      const pendingIndustriesTotal =
        r.pendingIndustriesTotal ?? stores.reduce((sum, s) => sum + (s.pendingCount || 0), 0);
      return {
        ...r,
        stores,
        pendingIndustriesTotal,
        storesFeitas: r.storesFeitas ?? stores.filter((s) => s.status === 'feita').length,
        storesEmExecucao: r.storesEmExecucao ?? stores.filter((s) => s.status === 'em_execucao').length,
        storesNaoFeitas: r.storesNaoFeitas ?? stores.filter((s) => s.status === 'nao_feita').length,
      };
    });
  }

  const byPromoter = new Map<string, Row[]>();
  for (const r of rows) {
    const id = r.promoter.id;
    byPromoter.set(id, [...(byPromoter.get(id) || []), r]);
  }

  return Array.from(byPromoter.entries()).map(([, group]) => {
    const base = group[0];
    type AccStore = StoreChip & { industryMap: Map<string, IndustryChip> };
    const storeMap = new Map<string, AccStore>();

    for (const r of group) {
      if (!r.store?.id) continue;
      let acc = storeMap.get(r.store.id);
      if (!acc) {
        acc = {
          id: r.store.id,
          name: r.store.name,
          status: 'nao_feita',
          executionPct: null,
          photoCount: 0,
          industriesRequired: 0,
          industriesCovered: 0,
          pendingCount: 0,
          industries: [],
          industryMap: new Map(),
        };
        storeMap.set(r.store.id, acc);
      }

      if (r.industry?.id) {
        const sent = r.deliveryStatus === 'enviado' || (r.photoCount || 0) > 0;
        acc.industryMap.set(r.industry.id, {
          id: r.industry.id,
          code: r.industry.code,
          name: r.industry.name,
          abbreviation: r.industry.abbreviation ?? null,
          status: sent ? 'enviado' : 'pendente',
          photoCount: r.photoCount || 0,
        });
      }

      acc.photoCount += r.photoCount || 0;
      acc.executionPct = r.executionPct ?? acc.executionPct;
    }

    const stores: StoreChip[] = Array.from(storeMap.values()).map((acc) => {
      const industries = Array.from(acc.industryMap.values()).sort((a, b) =>
        a.status === b.status
          ? industryLabel(a).localeCompare(industryLabel(b))
          : a.status === 'pendente'
            ? -1
            : 1
      );
      const industriesCovered = industries.filter((i) => i.status === 'enviado').length;
      const pendingCount = industries.filter((i) => i.status === 'pendente').length;
      let status: StoreStatus = 'nao_feita';
      if (industries.length > 0 && pendingCount === 0) status = 'feita';
      else if (industriesCovered > 0) status = 'em_execucao';

      return {
        id: acc.id,
        name: acc.name,
        status,
        executionPct:
          industries.length > 0 ? Math.round((industriesCovered / industries.length) * 100) : acc.executionPct,
        photoCount: acc.photoCount,
        industriesRequired: industries.length,
        industriesCovered,
        pendingCount,
        industries,
      };
    });

    stores.sort((a, b) => (b.pendingCount || 0) - (a.pendingCount || 0) || a.name.localeCompare(b.name));

    const photoCount = group.reduce((s, r) => s + (r.photoCount || 0), 0);
    const firstSentAt =
      group
        .map((r) => r.firstSentAt)
        .filter(Boolean)
        .sort()[0] || null;
    const sent = photoCount > 0 || group.some((r) => r.deliveryStatus === 'enviado');
    const pendingIndustriesTotal = stores.reduce((sum, s) => sum + (s.pendingCount || 0), 0);

    return {
      promoter: base.promoter,
      deliveryStatus: sent ? 'enviado' : 'sem_envio',
      deadlineStatus: base.deadlineStatus,
      firstSentAt,
      photoCount,
      executionPct: base.executionPct,
      statusLabel: base.statusLabel,
      statusBucket: base.statusBucket,
      stores,
      storesCount: stores.length,
      storesFeitas: stores.filter((s) => s.status === 'feita').length,
      storesEmExecucao: stores.filter((s) => s.status === 'em_execucao').length,
      storesNaoFeitas: stores.filter((s) => s.status === 'nao_feita').length,
      pendingIndustriesTotal,
    };
  });
}

export default function PromotersTable({
  rows,
  onOpenPromoter,
}: {
  rows: Row[];
  onOpenPromoter: (promoterId: string) => void;
}) {
  const sorted = useMemo(() => {
    const normalized = normalizePromoterRows(rows);
    return [...normalized].sort((a, b) => {
      const pendingDiff = (b.pendingIndustriesTotal || 0) - (a.pendingIndustriesTotal || 0);
      if (pendingDiff !== 0) return pendingDiff;
      const rank = (l: Row['statusLabel']) =>
        l === 'Sem envio' ? 0 : l === 'Crítico' ? 1 : l === 'Atenção' ? 2 : l === 'Bom' ? 3 : 4;
      return rank(a.statusLabel) - rank(b.statusLabel) || a.promoter.name.localeCompare(b.promoter.name);
    });
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-text-primary font-bold">Operação — hoje</div>
          <div className="text-text-secondary text-xs mt-1">
            Loja → indústrias:{' '}
            <span className="text-success-400">verde enviou</span>
            {' · '}
            <span className="text-error-400">vermelho cobrar</span>
            {' · loja: '}
            <span className="text-success-400">feita</span>
            {' / '}
            <span className="text-warning-400">em execução</span>
            {' / '}
            <span className="text-error-400">não feita</span>
          </div>
        </div>
        <Badge variant="gray">{sorted.length} promotores</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-dark-backgroundSecondary border-b border-dark-border z-10">
              <tr className="text-text-secondary">
                <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                <th className="text-left px-4 py-3 font-semibold min-w-[360px]">Lojas / indústrias</th>
                <th className="text-left px-4 py-3 font-semibold">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold">Horário</th>
                <th className="text-right px-4 py-3 font-semibold">Fotos</th>
                <th className="text-right px-4 py-3 font-semibold">Execução</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const stores = r.stores || [];
                const feitas = r.storesFeitas ?? stores.filter((s) => s.status === 'feita').length;
                const emExec = r.storesEmExecucao ?? stores.filter((s) => s.status === 'em_execucao').length;
                const naoFeitas = r.storesNaoFeitas ?? stores.filter((s) => s.status === 'nao_feita').length;
                const pending = r.pendingIndustriesTotal ?? stores.reduce((s, st) => s + (st.pendingCount || 0), 0);

                return (
                  <tr
                    key={r.promoter.id}
                    className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer align-top"
                    onClick={() => onOpenPromoter(r.promoter.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-text-primary font-semibold">{r.promoter.name}</div>
                      <div className="text-text-secondary text-xs">{r.promoter.state ?? '—'}</div>
                      {pending > 0 && (
                        <div className="mt-1.5">
                          <Badge variant="error" size="sm">
                            {pending} a cobrar
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {stores.length === 0 ? (
                        <span className="text-text-tertiary text-xs">
                          Sem lojas na rota e sem visita hoje
                        </span>
                      ) : (
                        <div className="space-y-2.5">
                          {stores.map((s) => {
                            const industries = s.industries || [];
                            const pendingLabels = industries
                              .filter((i) => i.status === 'pendente')
                              .map(industryLabel);

                            return (
                              <div
                                key={s.id}
                                className={`rounded-xl border bg-dark-backgroundSecondary/60 px-3 py-2 ${storeBorderClass(s.status)}`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${storeDotClass(s.status)}`} />
                                    <span className="text-text-primary text-xs font-semibold truncate">
                                      {shortStoreName(s.name)}
                                    </span>
                                    {!s.visited && s.fromRoute && (
                                      <span className="text-[10px] text-error-400 shrink-0">sem visita</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                                    {s.industriesCovered}/{s.industriesRequired}
                                  </span>
                                </div>

                                {industries.length === 0 ? (
                                  <div className="text-[11px] text-text-tertiary">
                                    Sem indústrias vinculadas a esta loja
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {industries.map((ind) => (
                                      <span
                                        key={ind.id}
                                        title={`${ind.name} · ${ind.status === 'enviado' ? `${ind.photoCount} foto(s)` : 'SEM FOTO — cobrar'}`}
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${industryChipClass(ind.status)}`}
                                      >
                                        {industryLabel(ind)}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {pendingLabels.length > 0 && (
                                  <div className="mt-1.5 text-[10px] text-error-400">
                                    Cobrar: {pendingLabels.join(', ')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="text-[11px] text-text-tertiary tabular-nums flex flex-wrap gap-x-2 gap-y-0.5">
                            <span className="text-success-400">
                              {feitas} feita{feitas === 1 ? '' : 's'}
                            </span>
                            <span>·</span>
                            <span className="text-warning-400">{emExec} em execução</span>
                            <span>·</span>
                            <span className="text-error-400">
                              {naoFeitas} não feita{naoFeitas === 1 ? '' : 's'}
                            </span>
                            {pending > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-error-400 font-semibold">{pending} a cobrar</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          r.deadlineStatus === 'no_prazo'
                            ? 'success'
                            : r.deadlineStatus === 'fora_do_prazo'
                              ? 'warning'
                              : 'gray'
                        }
                        size="sm"
                      >
                        {r.deadlineStatus === 'no_prazo'
                          ? 'No prazo'
                          : r.deadlineStatus === 'fora_do_prazo'
                            ? 'Fora do prazo'
                            : '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-primary">{formatTimeBR(r.firstSentAt)}</td>
                    <td className="px-4 py-3 text-right text-text-primary tabular-nums">{r.photoCount}</td>
                    <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                      {formatPct(r.executionPct)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(r.statusLabel)} size="sm">
                        {r.statusLabel}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
