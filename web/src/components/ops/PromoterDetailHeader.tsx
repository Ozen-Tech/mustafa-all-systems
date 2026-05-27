import React from 'react';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatTimeBR } from './opsFormat';

export default function PromoterDetailHeader({
  promoter,
  headline,
}: {
  promoter: { id: string; name: string; email: string; state: string | null };
  headline: {
    sentToday: boolean;
    onTime: boolean;
    firstSentAt: string | null;
    deadlineStatus: 'no_prazo' | 'fora_do_prazo' | 'sem_envio';
    statusLabel: string;
  };
}) {
  return (
    <Card className="bg-gradient-to-br from-primary-600/15 to-dark-card border border-primary-600/30">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-text-primary text-xl font-bold truncate">{promoter.name}</div>
            <div className="text-text-secondary text-sm mt-1">
              {promoter.state ?? '—'} • {promoter.email}
            </div>
            <div className="text-text-secondary text-sm mt-1">
              Primeiro envio: <span className="text-text-primary font-semibold">{formatTimeBR(headline.firstSentAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={headline.sentToday ? 'success' : 'error'}>
              {headline.sentToday ? 'Enviou hoje' : 'Sem envio'}
            </Badge>
            <Badge variant={headline.deadlineStatus === 'no_prazo' ? 'success' : headline.deadlineStatus === 'fora_do_prazo' ? 'warning' : 'gray'}>
              {headline.deadlineStatus === 'no_prazo' ? 'No prazo' : headline.deadlineStatus === 'fora_do_prazo' ? 'Fora do prazo' : '—'}
            </Badge>
            <Badge variant="primary">{headline.statusLabel}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

