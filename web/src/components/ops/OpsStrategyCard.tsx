import React from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';

export default function OpsStrategyCard() {
  return (
    <Card className="bg-gradient-to-br from-violet-600/10 to-dark-card border border-violet-600/30">
      <CardHeader>
        <div className="text-text-primary font-bold">Leitura estratégica (rápida)</div>
        <div className="text-text-secondary text-xs mt-1">
          Esta tela não mede só presença — mede cobertura, qualidade e trade.
        </div>
      </CardHeader>
      <CardContent className="text-sm text-text-secondary space-y-2">
        <div>
          - <span className="text-text-primary font-semibold">Cobrança</span>: sem envio e fora do prazo até 20:00 BRT.
        </div>
        <div>
          - <span className="text-text-primary font-semibold">Cobertura real</span>: lojas e indústrias realmente evidenciadas.
        </div>
        <div>
          - <span className="text-text-primary font-semibold">Qualidade</span>: fotos aproveitáveis (completude/consistência).
        </div>
        <div>
          - <span className="text-text-primary font-semibold">Trade</span>: auditoria de preço hoje (proxy inicial), com ganchos para ruptura/ponto extra/share.
        </div>
      </CardContent>
    </Card>
  );
}

