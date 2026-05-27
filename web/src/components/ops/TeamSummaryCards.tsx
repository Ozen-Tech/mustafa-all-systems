import React from 'react';
import Card, { CardContent } from '../ui/Card';

export default function TeamSummaryCards({
  summary,
}: {
  summary: {
    promotersScheduledToday: number;
    promotersSentPhoto: number;
    promotersNoSend: number;
    promotersOnTime: number;
    storesCovered: number;
    averageEvidenceQuality: number;
  };
}) {
  const items = [
    { label: 'Promotores (hoje)', value: summary.promotersScheduledToday, tone: 'primary' as const },
    { label: 'Enviaram foto', value: summary.promotersSentPhoto, tone: 'success' as const },
    { label: 'Sem envio', value: summary.promotersNoSend, tone: 'error' as const },
    { label: 'No prazo', value: summary.promotersOnTime, tone: 'accent' as const },
    { label: 'Lojas cobertas', value: summary.storesCovered, tone: 'primary' as const },
    { label: 'Qualidade média', value: `${summary.averageEvidenceQuality}%`, tone: 'accent' as const },
  ];

  const toneClasses = {
    primary: 'from-primary-600/20 to-primary-700/10 border-primary-600/40',
    accent: 'from-violet-600/20 to-violet-700/10 border-violet-600/40',
    success: 'from-success-500/15 to-success-600/5 border-success-500/40',
    error: 'from-error-500/15 to-error-600/5 border-error-500/40',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
      {items.map((it) => (
        <Card
          key={it.label}
          className={`bg-gradient-to-br ${toneClasses[it.tone]} border`}
        >
          <CardContent className="p-5">
            <div className="text-text-secondary text-xs font-semibold tracking-wide uppercase">
              {it.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-text-primary">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

