import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';

export default function WhatToMeasurePanel() {
  const items = [
    'Aderência diária de envio (e prazo até 20:00 BRT)',
    'Cobertura real de lojas e indústrias',
    'Qualidade das fotos (aproveitáveis)',
    'Auditoria de preço',
    'Ruptura (quando houver coleta)',
    'Ponto extra (quando houver coleta)',
    'Share de gôndola (quando houver coleta)',
  ];

  return (
    <Card className="border border-violet-600/25 bg-gradient-to-b from-violet-600/10 to-dark-card">
      <CardHeader>
        <div className="text-text-primary font-bold">O que medir aqui</div>
        <div className="text-text-secondary text-xs mt-1">Checklist operacional de trade</div>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-2 text-sm text-text-secondary">
          {items.map((it) => (
            <li key={it} className="flex gap-2">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

