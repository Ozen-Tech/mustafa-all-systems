import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';

export default function QuickActionsPanel({
  onViewPhotos,
  onNudge,
  onValidate,
  onEscalate,
}: {
  onViewPhotos: () => void;
  onNudge: () => void;
  onValidate: () => void;
  onEscalate: () => void;
}) {
  return (
    <Card className="border border-primary-600/25 bg-gradient-to-b from-primary-600/10 to-dark-card">
      <CardHeader>
        <div className="text-text-primary font-bold">Ações rápidas</div>
        <div className="text-text-secondary text-xs mt-1">Operação e cobrança</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="outline" className="w-full" onClick={onViewPhotos}>
          Ver fotos enviadas
        </Button>
        <Button variant="primary" className="w-full" onClick={onNudge}>
          Cobrar pendência do dia
        </Button>
        <Button variant="ghost" className="w-full" onClick={onValidate}>
          Validar execução
        </Button>
        <Button variant="ghost" className="w-full" onClick={onEscalate}>
          Encaminhar ao supervisor
        </Button>
      </CardContent>
    </Card>
  );
}

