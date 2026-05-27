import React from 'react';
import Card, { CardContent } from '../ui/Card';

export default function TradeMetricsCards({
  cards,
}: {
  cards: {
    averageStoreExecutionPct: number;
    rupturesIdentified: number;
    priceAudits: number;
    storesWithPointExtra: number;
    shelfShareAvgPct: number | null;
    usablePhotosPct: number;
  };
}) {
  const items = [
    { label: 'Execução média', value: `${cards.averageStoreExecutionPct}%` },
    { label: 'Rupturas', value: cards.rupturesIdentified, hint: 'placeholder' },
    { label: 'Auditoria de preço', value: cards.priceAudits },
    { label: 'Ponto extra (lojas)', value: cards.storesWithPointExtra, hint: 'placeholder' },
    { label: 'Share gôndola (média)', value: cards.shelfShareAvgPct == null ? '—' : `${cards.shelfShareAvgPct}%`, hint: 'placeholder' },
    { label: 'Fotos aproveitáveis', value: `${cards.usablePhotosPct}%` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
      {items.map((it) => (
        <Card
          key={it.label}
          className={`bg-gradient-to-br from-primary-600/15 to-dark-card border ${
            it.hint ? 'border-dark-border' : 'border-primary-600/30'
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
                {it.label}
              </div>
              {it.hint && (
                <div className="text-[10px] text-text-tertiary border border-dark-border rounded-full px-2 py-0.5">
                  v1
                </div>
              )}
            </div>
            <div className="mt-2 text-2xl font-bold text-text-primary">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

