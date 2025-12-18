import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supervisorService } from '../services/supervisorService';
import Card, { CardHeader, CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

interface Industry {
  id: string;
  name: string;
  code: string;
}

interface PendingStore {
  store: {
    id: string;
    name: string;
    address: string;
  };
  totalRequired: number;
  totalCovered: number;
  pendingIndustries: Industry[];
  coveredIndustries: Industry[];
  lastVisit?: {
    id: string;
    checkInAt: string;
    promoter: {
      id: string;
      name: string;
    };
  };
  visitsCount: number;
}

interface PendingPromoter {
  promoter: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
  };
  visitId: string;
  visitDate: string;
  totalRequired: number;
  totalCovered: number;
  pendingIndustries: Array<Industry & { storeName: string }>;
  coveredIndustries: Industry[];
  percentComplete: number;
}

export default function PendingIndustriesWidget() {
  const [view, setView] = useState<'store' | 'promoter'>('store');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-industries', view, date],
    queryFn: () => supervisorService.getPendingIndustries(view, date),
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🔴 Pendências de Indústrias
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-text-secondary animate-pulse">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🔴 Pendências de Indústrias
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-error">Erro ao carregar pendências</div>
        </CardContent>
      </Card>
    );
  }

  const stats = data?.stats;
  const pending = data?.pending || [];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            🔴 Pendências de Indústrias
            {pending.length > 0 && (
              <Badge variant="error">{pending.length}</Badge>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex rounded-lg overflow-hidden border border-dark-border">
              <button
                onClick={() => setView('store')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === 'store'
                    ? 'bg-primary text-white'
                    : 'bg-dark-card text-text-secondary hover:bg-dark-cardElevated'
                }`}
              >
                Por Loja
              </button>
              <button
                onClick={() => setView('promoter')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  view === 'promoter'
                    ? 'bg-primary text-white'
                    : 'bg-dark-card text-text-secondary hover:bg-dark-cardElevated'
                }`}
              >
                Por Promotor
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-background p-3 rounded-lg">
              <div className="text-xs text-text-tertiary uppercase">
                {view === 'store' ? 'Lojas c/ Requisitos' : 'Visitas c/ Requisitos'}
              </div>
              <div className="text-xl font-bold text-text-primary">
                {view === 'store' ? stats.totalStoresWithRequirements : stats.totalVisitsWithRequirements}
              </div>
            </div>
            <div className="bg-dark-background p-3 rounded-lg">
              <div className="text-xs text-text-tertiary uppercase">Pendentes</div>
              <div className="text-xl font-bold text-error">
                {view === 'store' ? stats.totalStoresWithPending : stats.totalVisitsWithPending}
              </div>
            </div>
            <div className="bg-dark-background p-3 rounded-lg">
              <div className="text-xs text-text-tertiary uppercase">Completas</div>
              <div className="text-xl font-bold text-success">
                {view === 'store' ? stats.totalStoresComplete : stats.totalVisitsComplete}
              </div>
            </div>
            <div className="bg-dark-background p-3 rounded-lg">
              <div className="text-xs text-text-tertiary uppercase">Conformidade</div>
              <div className={`text-xl font-bold ${
                stats.complianceRate >= 80 ? 'text-success' : 
                stats.complianceRate >= 50 ? 'text-warning' : 'text-error'
              }`}>
                {stats.complianceRate}%
              </div>
            </div>
          </div>
        )}

        {/* Lista de Pendências */}
        {pending.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-text-secondary">
              Nenhuma pendência de indústria encontrada para esta data!
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {view === 'store' ? (
              // Visão por Loja
              (pending as PendingStore[]).map((item) => (
                <div
                  key={item.store.id}
                  className="bg-dark-background rounded-lg border border-dark-border overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedItem(
                      expandedItem === item.store.id ? null : item.store.id
                    )}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-dark-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
                        <span className="text-error font-bold">
                          {item.pendingIndustries.length}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{item.store.name}</div>
                        <div className="text-sm text-text-secondary">
                          {item.pendingIndustries.length} indústria(s) pendente(s)
                        </div>
                      </div>
                    </div>
                    <span className="text-text-tertiary">
                      {expandedItem === item.store.id ? '▼' : '▶'}
                    </span>
                  </button>
                  
                  {expandedItem === item.store.id && (
                    <div className="p-4 pt-0 space-y-3 animate-fade-in">
                      <div className="text-xs text-text-tertiary">
                        {item.lastVisit ? (
                          <>
                            Última visita: {item.lastVisit.promoter.name} em{' '}
                            {new Date(item.lastVisit.checkInAt).toLocaleString('pt-BR')}
                          </>
                        ) : (
                          'Sem visitas registradas hoje'
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-text-tertiary mb-1">Pendentes:</div>
                        <div className="flex flex-wrap gap-1">
                          {item.pendingIndustries.map((industry) => (
                            <Badge key={industry.id} variant="error">
                              {industry.code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {item.coveredIndustries.length > 0 && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">Cobertas:</div>
                          <div className="flex flex-wrap gap-1">
                            {item.coveredIndustries.map((industry) => (
                              <Badge key={industry.id} variant="success">
                                {industry.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Visão por Promotor
              (pending as PendingPromoter[]).map((item) => (
                <div
                  key={item.visitId}
                  className="bg-dark-background rounded-lg border border-dark-border overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedItem(
                      expandedItem === item.visitId ? null : item.visitId
                    )}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-dark-card transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                        {item.promoter.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{item.promoter.name}</div>
                        <div className="text-sm text-text-secondary">
                          {item.store.name} - {item.percentComplete}% completo
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="error">{item.pendingIndustries.length} pendentes</Badge>
                      <span className="text-text-tertiary">
                        {expandedItem === item.visitId ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  
                  {expandedItem === item.visitId && (
                    <div className="p-4 pt-0 space-y-3 animate-fade-in">
                      <div className="text-xs text-text-tertiary">
                        Visita iniciada: {new Date(item.visitDate).toLocaleString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-text-secondary">
                          {item.totalCovered}/{item.totalRequired} indústrias
                        </span>
                        <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.percentComplete >= 80 ? 'bg-success' : 
                              item.percentComplete >= 50 ? 'bg-warning' : 'bg-error'
                            }`}
                            style={{ width: `${item.percentComplete}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-text-tertiary mb-1">Pendentes:</div>
                        <div className="flex flex-wrap gap-1">
                          {item.pendingIndustries.map((industry) => (
                            <Badge key={industry.id} variant="error">
                              {industry.code} - {industry.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {item.coveredIndustries.length > 0 && (
                        <div>
                          <div className="text-xs text-text-tertiary mb-1">Cobertas:</div>
                          <div className="flex flex-wrap gap-1">
                            {item.coveredIndustries.map((industry) => (
                              <Badge key={industry.id} variant="success">
                                {industry.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


