import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

type RankItem = {
  position: number;
  promoter: { id: string; name: string; state: string | null };
  store: { id: string; name: string } | null;
  status: string;
  executionPct: number;
  photosValid: number;
  photosTotal: number;
  priceAuditCount: number;
  pointExtraActive: number;
  shelfSharePct: number | null;
  ruptureCount: number;
  score: number;
};

export default function TradeImpactRanking({ items, onOpenPromoter }: { items: RankItem[]; onOpenPromoter: (id: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-text-primary font-bold">Ranking — impacto em trade</div>
          <div className="text-text-secondary text-xs mt-1">
            Score composto: aderência + qualidade + execução + auditoria de preço (v1)
          </div>
        </div>
        <Badge variant="gray">{items.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-dark-backgroundSecondary border-b border-dark-border">
              <tr className="text-text-secondary">
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Promotor</th>
                <th className="text-left px-4 py-3 font-semibold">Loja</th>
                <th className="text-right px-4 py-3 font-semibold">Score</th>
                <th className="text-right px-4 py-3 font-semibold">Execução</th>
                <th className="text-right px-4 py-3 font-semibold">Fotos válidas</th>
                <th className="text-right px-4 py-3 font-semibold">Preço</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.promoter.id}
                  className="border-b border-dark-border hover:bg-primary-600/5 cursor-pointer"
                  onClick={() => onOpenPromoter(it.promoter.id)}
                >
                  <td className="px-4 py-3 text-text-primary font-semibold tabular-nums">{it.position}</td>
                  <td className="px-4 py-3">
                    <div className="text-text-primary font-semibold">{it.promoter.name}</div>
                    <div className="text-text-secondary text-xs">{it.promoter.state ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{it.store?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={it.score >= 85 ? 'success' : it.score >= 70 ? 'warning' : 'error'} size="sm">
                      {it.score}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary tabular-nums">{it.executionPct}%</td>
                  <td className="px-4 py-3 text-right text-text-primary tabular-nums">
                    {it.photosValid}/{it.photosTotal}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary tabular-nums">{it.priceAuditCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

