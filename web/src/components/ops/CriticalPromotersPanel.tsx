import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

export default function CriticalPromotersPanel({
  items,
}: {
  items: Array<{
    promoter: { id: string; name: string; state: string | null };
    store: { id: string; name: string } | null;
    executionPct: number;
    photosValid: number;
    ruptureCount: number;
  }>;
}) {
  return (
    <Card className="border border-warning-500/30 bg-gradient-to-b from-warning-500/10 to-dark-card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-text-primary font-bold">Promotores com risco hoje</div>
          <div className="text-text-secondary text-xs mt-1">
            Critérios v1: execução &lt; 75% OU fotos válidas baixas OU pendência de envio
          </div>
        </div>
        <Badge variant="warning">{items.length}</Badge>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <div className="text-text-secondary text-sm">Sem riscos detectados (pelas regras v1).</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {items.map((it) => (
              <div
                key={it.promoter.id}
                className="rounded-lg border border-dark-border bg-dark-backgroundSecondary px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-text-primary font-semibold truncate">{it.promoter.name}</div>
                    <div className="text-text-secondary text-xs truncate">
                      {it.store?.name ?? '—'} • {it.promoter.state ?? '—'}
                    </div>
                  </div>
                  <Badge variant={it.executionPct < 70 ? 'error' : 'warning'} size="sm">
                    {it.executionPct}%
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-text-secondary flex gap-3">
                  <div>
                    <span className="text-text-tertiary">Fotos válidas:</span> {it.photosValid}
                  </div>
                  <div>
                    <span className="text-text-tertiary">Ruptura:</span> {it.ruptureCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

