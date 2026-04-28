import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

export default function PromoterTradeMetrics({
  cards,
}: {
  cards: {
    photosValid: number;
    photosTotal: number;
    evidenceQualityPct: number;
    executionPct: number;
    priceAuditCount: number;
    rupture: number;
    pointExtra: number;
    shelfSharePct: number | null;
  };
}) {
  type BadgeVariant = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'gray';
  const items = [
    {
      label: 'Execução',
      value: `${cards.executionPct}%`,
      variant: (cards.executionPct >= 85 ? 'success' : cards.executionPct >= 70 ? 'warning' : 'error') as BadgeVariant,
    },
    { label: 'Fotos válidas', value: `${cards.photosValid}/${cards.photosTotal}`, variant: 'primary' as BadgeVariant },
    {
      label: 'Qualidade',
      value: `${cards.evidenceQualityPct}%`,
      variant: (cards.evidenceQualityPct >= 70 ? 'success' : 'warning') as BadgeVariant,
    },
    { label: 'Auditoria de preço', value: `${cards.priceAuditCount}`, variant: 'accent' as BadgeVariant },
    { label: 'Ruptura', value: `${cards.rupture}`, variant: 'gray' as BadgeVariant },
    { label: 'Ponto extra', value: `${cards.pointExtra}`, variant: 'gray' as BadgeVariant },
    {
      label: 'Share gôndola',
      value: cards.shelfSharePct == null ? '—' : `${cards.shelfSharePct}%`,
      variant: 'gray' as BadgeVariant,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="text-text-primary font-bold">Métricas do dia</div>
        <div className="text-text-secondary text-xs mt-1">Trade + evidências (v1)</div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-dark-border bg-dark-backgroundSecondary px-4 py-3 flex items-center justify-between"
          >
            <div className="text-text-secondary text-sm">{it.label}</div>
            <Badge variant={it.variant}>{it.value}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

