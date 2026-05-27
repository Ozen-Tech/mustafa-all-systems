import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

export default function DiagnosisPanel({
  headline,
  cards,
}: {
  headline: { sentToday: boolean; onTime: boolean };
  cards: { executionPct: number; evidenceQualityPct: number; photosValid: number; photosTotal: number };
}) {
  const issues: string[] = [];
  if (!headline.sentToday) issues.push('Sem envio hoje');
  if (headline.sentToday && !headline.onTime) issues.push('Enviou fora do prazo (20:00 BRT)');
  if (cards.executionPct < 75) issues.push('Execução abaixo de 75%');
  if (cards.photosTotal > 0 && cards.photosValid / cards.photosTotal < 0.5) issues.push('Baixa proporção de fotos válidas');

  return (
    <Card className="border border-warning-500/25 bg-gradient-to-b from-warning-500/10 to-dark-card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="text-text-primary font-bold">Diagnóstico rápido</div>
          <div className="text-text-secondary text-xs mt-1">Sinais para cobrança e ação</div>
        </div>
        <Badge variant={issues.length === 0 ? 'success' : 'warning'}>{issues.length === 0 ? 'OK' : 'RISCO'}</Badge>
      </CardHeader>
      <CardContent className="p-4">
        {issues.length === 0 ? (
          <div className="text-text-secondary text-sm">Sem sinais críticos hoje (regras v1).</div>
        ) : (
          <ul className="space-y-2 text-sm text-text-secondary">
            {issues.map((i) => (
              <li key={i} className="flex gap-2">
                <span className="text-warning-500 mt-0.5">•</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

