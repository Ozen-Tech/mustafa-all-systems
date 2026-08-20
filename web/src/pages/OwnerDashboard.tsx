import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  currentPeriod,
  feedService,
  formatBRL,
} from '../services/commercialService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function OwnerDashboard() {
  const [period, setPeriod] = useState(currentPeriod());

  const { data, isLoading } = useQuery({
    queryKey: ['feed-dashboard', period],
    queryFn: () => feedService.dashboard(period),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Painel central</h1>
          <p className="text-text-secondary text-sm mt-1">
            Visão do dono: metas, pedidos por indústria/rede, pendências e o que cada um lançou.
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <Input
            label="Período"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-44"
          />
          <Link to="/feed">
            <Button variant="ghost">Abrir feed</Button>
          </Link>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-text-secondary">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Pedidos no mês</div>
                <div className="text-2xl font-bold text-text-primary">{data.totals.orderCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Valor pedidos</div>
                <div className="text-2xl font-bold text-text-primary">
                  {formatBRL(data.totals.totalValue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-text-secondary">Pendências abertas</div>
                <div className="text-2xl font-bold text-text-primary">
                  {data.openPendings.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary">Metas vs realizado</h2>
                <Link to="/metas" className="text-xs text-primary-400">
                  Gerenciar
                </Link>
              </CardHeader>
              <CardContent>
                {!data.goalProgress.length ? (
                  <p className="text-sm text-text-secondary">Nenhuma meta neste período.</p>
                ) : (
                  <div className="space-y-3">
                    {data.goalProgress.map((g) => {
                      const scope = [
                        g.goal.industry?.name,
                        g.goal.chain?.name,
                        g.goal.store?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Geral';
                      const pct = Math.min(g.pct, 100);
                      return (
                        <div key={g.goal.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-text-primary">{scope}</span>
                            <span className="text-text-secondary">{g.pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-dark-border overflow-hidden">
                            <div
                              className={`h-full ${g.pct >= 95 ? 'bg-green-500' : 'bg-accent-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-text-secondary mt-1">
                            {g.goal.metric === 'ORDER_VALUE'
                              ? `${formatBRL(g.realized)} / ${formatBRL(g.goal.targetValue)}`
                              : `${g.realized.toLocaleString('pt-BR')} / ${g.goal.targetValue.toLocaleString('pt-BR')}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary">Pedidos por indústria</h2>
                <Link to="/pedidos" className="text-xs text-primary-400">
                  Ver pedidos
                </Link>
              </CardHeader>
              <CardContent>
                {!data.byIndustry.length ? (
                  <p className="text-sm text-text-secondary">Sem pedidos no período.</p>
                ) : (
                  <div className="space-y-2">
                    {data.byIndustry.map((r) => (
                      <div key={r.label} className="flex justify-between text-sm">
                        <span className="text-text-primary">{r.label}</span>
                        <span className="text-text-secondary">
                          {r.orderCount} · {formatBRL(r.totalValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">Pedidos por rede</h2>
              </CardHeader>
              <CardContent>
                {!data.byChain.length ? (
                  <p className="text-sm text-text-secondary">Sem pedidos no período.</p>
                ) : (
                  <div className="space-y-2">
                    {data.byChain.map((r) => (
                      <div key={r.chainId} className="flex justify-between text-sm">
                        <span className="text-text-primary">{r.label}</span>
                        <span className="text-text-secondary">
                          {r.orderCount} · {formatBRL(r.totalValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary">Pendências abertas</h2>
                <Link to="/feed" className="text-xs text-primary-400">
                  Feed completo
                </Link>
              </CardHeader>
              <CardContent>
                {!data.openPendings.length ? (
                  <p className="text-sm text-text-secondary">Nenhuma pendência aberta.</p>
                ) : (
                  <div className="space-y-2">
                    {data.openPendings.map((p) => (
                      <div key={p.id} className="p-2 rounded border border-dark-border">
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">{p.type}</Badge>
                          <span className="text-sm text-text-primary">{p.title}</span>
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {p.author?.name}
                          {p.assignee ? ` → ${p.assignee.name}` : ''}
                          {p.chain?.name ? ` · ${p.chain.name}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">Últimas importações</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentImports.map((imp) => (
                  <div key={imp.id} className="flex justify-between text-sm">
                    <div>
                      <div className="text-text-primary">{imp.fileName}</div>
                      <div className="text-xs text-text-secondary">
                        {imp.chain?.name} · {imp.uploadedBy?.name || '—'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        imp.status === 'DONE'
                          ? 'success'
                          : imp.status === 'FAILED'
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {imp.status}
                    </Badge>
                  </div>
                ))}
                {!data.recentImports.length && (
                  <p className="text-sm text-text-secondary">Nenhuma importação ainda.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-text-primary">Atividade recente</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentFeed.map((e) => (
                  <div key={e.id} className="text-sm border-b border-dark-border/40 pb-2">
                    <div className="text-text-primary">{e.title}</div>
                    <div className="text-xs text-text-secondary">
                      {e.author?.name} · {new Date(e.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
                {!data.recentFeed.length && (
                  <p className="text-sm text-text-secondary">Sem atividade.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
