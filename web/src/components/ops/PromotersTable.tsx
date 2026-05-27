import React from 'react';
import Badge from '../ui/Badge';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { formatPct, formatTimeBR } from './opsFormat';

type Row = {
  promoter: { id: string; name: string; email: string; state: string | null };
  store: { id: string; name: string; address: string } | null;
  industry: { id: string; name: string; code: string } | null;
  deliveryStatus: 'enviado' | 'sem_envio';
  deadlineStatus: 'no_prazo' | 'fora_do_prazo' | 'sem_envio';
  firstSentAt: string | null;
  photoCount: number;
  executionPct: number | null;
  statusLabel: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' | 'Sem envio';
  statusBucket: string;
};

function statusBadgeVariant(label: Row['statusLabel']): 'success' | 'primary' | 'warning' | 'error' | 'gray' {
  if (label === 'Excelente') return 'success';
  if (label === 'Bom') return 'primary';
  if (label === 'Atenção') return 'warning';
  if (label === 'Crítico') return 'error';
  return 'gray';
}

export default function PromotersTable({
  rows,
  onOpenPromoter,
}: {
  rows: Row[];
  onOpenPromoter: (promoterId: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const rank = (l: Row['statusLabel']) =>
      l === 'Sem envio' ? 0 : l === 'Crítico' ? 1 : l === 'Atenção' ? 2 : l === 'Bom' ? 3 : 4;
    return rank(a.statusLabel) - rank(b.statusLabel);
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-text-primary font-bold">Operação — hoje</div>
          <div className="text-text-secondary text-xs mt-1">
            Envio, prazo (20:00 BRT), execução e qualidade
          </div>
        </div>
        <Badge variant="gray">{sorted.length} linhas</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-dark-backgroundSecondary border-b border-dark-border">
              <tr className="text-text-secondary">
                <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                <th className="text-left px-4 py-3 font-semibold">Loja</th>
                <th className="text-left px-4 py-3 font-semibold">Indústria</th>
                <th className="text-left px-4 py-3 font-semibold">Envio</th>
                <th className="text-left px-4 py-3 font-semibold">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold">Horário</th>
                <th className="text-right px-4 py-3 font-semibold">Fotos</th>
                <th className="text-right px-4 py-3 font-semibold">Execução</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={`${r.promoter.id}:${r.store?.id ?? 'none'}:${r.industry?.id ?? 'none'}`}
                  className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer"
                  onClick={() => onOpenPromoter(r.promoter.id)}
                >
                  <td className="px-4 py-3">
                    <div className="text-text-primary font-semibold">{r.promoter.name}</div>
                    <div className="text-text-secondary text-xs">{r.promoter.state ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-text-primary">{r.store?.name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-text-primary">{r.industry?.code ?? '—'}</div>
                    <div className="text-text-secondary text-xs truncate max-w-[220px]">
                      {r.industry?.name ?? '—'}
                    </div>
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
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

