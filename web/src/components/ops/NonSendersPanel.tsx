import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

export default function NonSendersPanel({
  items,
}: {
  items: Array<{ promoter: { id: string; name: string; state: string | null }; badge: string }>;
}) {
  return (
    <Card className="border border-error-500/40 bg-gradient-to-b from-error-500/10 to-dark-card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-text-primary font-bold">Quem não enviou</div>
          <div className="text-text-secondary text-xs mt-1">Alta prioridade de cobrança</div>
        </div>
        <Badge variant="error">{items.length}</Badge>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <div className="text-text-secondary text-sm">Nenhuma pendência de envio hoje.</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {items.map((it) => (
              <div
                key={it.promoter.id}
                className="flex items-center justify-between rounded-lg border border-dark-border bg-dark-backgroundSecondary px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-text-primary font-semibold truncate">{it.promoter.name}</div>
                  <div className="text-text-secondary text-xs">
                    {it.promoter.state ?? '—'}
                  </div>
                </div>
                <Badge variant="error" size="sm">
                  {it.badge}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

