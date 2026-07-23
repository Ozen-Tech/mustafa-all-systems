import React, { useMemo } from 'react';
import Badge from '../ui/Badge';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { formatPct, formatTimeBR } from './opsFormat';

type StoreStatus = 'feita' | 'em_execucao' | 'nao_feita';

type StoreChip = {
  id: string;
  name: string;
  status: StoreStatus;
  executionPct: number | null;
  photoCount: number;
  industriesRequired: number;
  industriesCovered: number;
};

type Row = {
  promoter: { id: string; name: string; email: string; state: string | null };
  // Campos do payload novo (1 linha / promotor)
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
  stores?: StoreChip[];
  // Campos do payload legado (1 linha / indústria)
  store?: { id: string; name: string; address: string } | null;
  industry?: { id: string; name: string; code: string } | null;
};

function statusBadgeVariant(label: Row['statusLabel']): 'success' | 'primary' | 'warning' | 'error' | 'gray' {
  if (label === 'Excelente') return 'success';
  if (label === 'Bom') return 'primary';
  if (label === 'Atenção') return 'warning';
  if (label === 'Crítico') return 'error';
  return 'gray';
}

function storeChipClass(status: StoreStatus): string {
  if (status === 'feita') {
    return 'bg-success-500/15 text-success-400 border-success-500/40';
  }
  if (status === 'em_execucao') {
    return 'bg-warning-500/15 text-warning-400 border-warning-500/40';
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
  return name.length > 36 ? `${name.slice(0, 34)}…` : name;
}

/** Normaliza payload legado (indústria x loja) → 1 linha por promotor. */
function normalizePromoterRows(rows: Row[]): Row[] {
  const looksAggregated = rows.length > 0 && Array.isArray(rows[0].stores);
  if (looksAggregated) return rows;

  const byPromoter = new Map<string, Row[]>();
  for (const r of rows) {
    const id = r.promoter.id;
    byPromoter.set(id, [...(byPromoter.get(id) || []), r]);
  }

  return Array.from(byPromoter.entries()).map(([, group]) => {
    const base = group[0];
    const storeMap = new Map<string, StoreChip>();

    for (const r of group) {
      if (!r.store?.id) continue;
      const prev = storeMap.get(r.store.id);
      const sent = r.deliveryStatus === 'enviado' || (r.photoCount || 0) > 0;
      const industriesRequired = (prev?.industriesRequired || 0) + 1;
      const industriesCovered = (prev?.industriesCovered || 0) + (sent ? 1 : 0);
      const photoCount = (prev?.photoCount || 0) + (r.photoCount || 0);
      const executionPct = r.executionPct ?? prev?.executionPct ?? null;

      let status: StoreStatus = 'nao_feita';
      if (
        (executionPct != null && executionPct >= 100) ||
        (industriesRequired > 0 && industriesCovered >= industriesRequired)
      ) {
        status = 'feita';
      } else if (industriesCovered > 0 || photoCount > 0) {
        status = 'em_execucao';
      }

      storeMap.set(r.store.id, {
        id: r.store.id,
        name: r.store.name,
        status,
        executionPct,
        photoCount,
        industriesRequired,
        industriesCovered,
      });
    }

    const stores = Array.from(storeMap.values());
    const photoCount = group.reduce((s, r) => s + (r.photoCount || 0), 0);
    const firstSentAt =
      group
        .map((r) => r.firstSentAt)
        .filter(Boolean)
        .sort()[0] || null;
    const sent = photoCount > 0 || group.some((r) => r.deliveryStatus === 'enviado');

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
            Uma linha por promotor · lojas:{' '}
            <span className="text-success-400">feita</span>
            {' · '}
            <span className="text-warning-400">em execução</span>
            {' · '}
            <span className="text-error-400">não feita</span>
          </div>
        </div>
        <Badge variant="gray">{sorted.length} promotores</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-dark-backgroundSecondary border-b border-dark-border">
              <tr className="text-text-secondary">
                <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                <th className="text-left px-4 py-3 font-semibold min-w-[280px]">Lojas hoje</th>
                <th className="text-left px-4 py-3 font-semibold">Envio</th>
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

                return (
                  <tr
                    key={r.promoter.id}
                    className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer align-top"
                    onClick={() => onOpenPromoter(r.promoter.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-text-primary font-semibold">{r.promoter.name}</div>
                      <div className="text-text-secondary text-xs">{r.promoter.state ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {stores.length === 0 ? (
                        <span className="text-text-tertiary text-xs">Nenhuma loja visitada hoje</span>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {stores.map((s) => (
                              <span
                                key={s.id}
                                title={`${s.name} · ${s.industriesCovered}/${s.industriesRequired} indústrias · ${s.photoCount} fotos`}
                                className={`inline-flex items-center gap-1.5 max-w-[220px] truncate px-2 py-1 rounded-lg border text-xs font-medium ${storeChipClass(s.status)}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    s.status === 'feita'
                                      ? 'bg-success-400'
                                      : s.status === 'em_execucao'
                                        ? 'bg-warning-400'
                                        : 'bg-error-400'
                                  }`}
                                />
                                {shortStoreName(s.name)}
                              </span>
                            ))}
                          </div>
                          <div className="text-[11px] text-text-tertiary tabular-nums">
                            <span className="text-success-400">{feitas} feita{feitas === 1 ? '' : 's'}</span>
                            {' · '}
                            <span className="text-warning-400">{emExec} em execução</span>
                            {' · '}
                            <span className="text-error-400">{naoFeitas} não feita{naoFeitas === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={r.deliveryStatus === 'enviado' ? 'success' : 'error'} size="sm">
                        {r.deliveryStatus === 'enviado' ? 'Enviado' : 'Sem envio'}
                      </Badge>
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
