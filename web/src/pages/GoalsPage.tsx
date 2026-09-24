import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  chainService,
  currentPeriod,
  formatBRL,
  goalService,
  GoalProgressRow,
} from '../services/commercialService';
import { industryService } from '../services/industryService';
import { useAuth } from '../context/AuthContext';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';
import { useConfirm } from '../hooks/useConfirm';

export default function GoalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [period, setPeriod] = useState(currentPeriod());
  const [form, setForm] = useState({
    metric: 'ORDER_VALUE' as 'ORDER_VALUE' | 'ORDER_QTY',
    industryId: '',
    chainId: '',
    targetValue: '',
    note: '',
  });

  const { data: progress, isLoading } = useQuery({
    queryKey: ['goals-progress', period],
    queryFn: () => goalService.progress(period),
  });

  const { data: chains = [] } = useQuery({
    queryKey: ['chains-active'],
    queryFn: () => chainService.list(true),
  });
  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: () => industryService.listIndustries(),
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      goalService.upsert({
        period,
        metric: form.metric,
        industryId: form.industryId || null,
        chainId: form.chainId || null,
        targetValue: Number(form.targetValue),
        note: form.note || null,
      }),
    onSuccess: () => {
      toast.success('Meta salva');
      setForm((f) => ({ ...f, targetValue: '', note: '' }));
      queryClient.invalidateQueries({ queryKey: ['goals-progress', period] });
      queryClient.invalidateQueries({ queryKey: ['feed-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar meta'),
  });

  async function handleDelete(row: GoalProgressRow) {
    const ok = await confirm({
      title: 'Remover meta?',
      description: 'Essa meta será excluída permanentemente.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await goalService.remove(row.goal.id);
      toast.success('Meta removida');
      queryClient.invalidateQueries({ queryKey: ['goals-progress', period] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao remover');
    }
  }

  function formatMetric(row: GoalProgressRow) {
    if (row.goal.metric === 'ORDER_QTY') {
      return {
        target: row.goal.targetValue.toLocaleString('pt-BR'),
        realized: row.realized.toLocaleString('pt-BR'),
        projection: (row.projection || 0).toLocaleString('pt-BR'),
      };
    }
    return {
      target: formatBRL(row.goal.targetValue),
      realized: formatBRL(row.realized),
      projection: formatBRL(row.projection || 0),
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Metas comerciais</h1>
          <p className="text-text-secondary text-sm mt-1">
            Defina metas de valor ou volume por indústria e/ou rede e acompanhe o realizado.
          </p>
        </div>
        <Input
          label="Período"
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-48"
        />
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Nova / atualizar meta</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Métrica</label>
                <select
                  className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                  value={form.metric}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      metric: e.target.value as 'ORDER_VALUE' | 'ORDER_QTY',
                    }))
                  }
                >
                  <option value="ORDER_VALUE">Valor (R$)</option>
                  <option value="ORDER_QTY">Volume (qtd)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Indústria</label>
                <select
                  className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                  value={form.industryId}
                  onChange={(e) => setForm((f) => ({ ...f, industryId: e.target.value }))}
                >
                  <option value="">Todas / nenhuma</option>
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Rede</label>
                <select
                  className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                  value={form.chainId}
                  onChange={(e) => setForm((f) => ({ ...f, chainId: e.target.value }))}
                >
                  <option value="">Todas / nenhuma</option>
                  {chains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Alvo"
                type="number"
                value={form.targetValue}
                onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                placeholder="Ex: 150000"
              />
              <div className="flex items-end">
                <Button
                  className="w-full"
                  disabled={!form.targetValue || upsertMutation.isPending}
                  onClick={() => upsertMutation.mutate()}
                >
                  Salvar meta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Progresso — {period}</h2>
            {progress?.days && (
              <span className="text-xs text-text-secondary">
                Dia {progress.days.elapsed}/{progress.days.total} · restam{' '}
                {progress.days.remaining} dias
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-text-secondary">Carregando...</p>
          ) : !progress?.rows?.length ? (
            <p className="text-text-secondary">Nenhuma meta neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-dark-border">
                    <th className="py-2">Escopo</th>
                    <th className="py-2">Métrica</th>
                    <th className="py-2 text-right">Alvo</th>
                    <th className="py-2 text-right">Realizado</th>
                    <th className="py-2 text-right">%</th>
                    <th className="py-2 text-right">Projeção</th>
                    <th className="py-2">Status</th>
                    {isAdmin && <th className="py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {progress.rows.map((row) => {
                    const fmt = formatMetric(row);
                    const scope = [
                      row.goal.industry?.name,
                      row.goal.chain?.name,
                      row.goal.store?.name,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Geral';
                    return (
                      <tr key={row.goal.id} className="border-b border-dark-border/50">
                        <td className="py-2 text-text-primary">{scope}</td>
                        <td className="py-2 text-text-secondary">
                          {row.goal.metric === 'ORDER_VALUE' ? 'Valor' : 'Volume'}
                        </td>
                        <td className="py-2 text-right text-text-primary">{fmt.target}</td>
                        <td className="py-2 text-right text-text-primary">{fmt.realized}</td>
                        <td className="py-2 text-right text-text-primary">
                          {row.pct.toFixed(0)}%
                        </td>
                        <td className="py-2 text-right text-text-secondary">{fmt.projection}</td>
                        <td className="py-2">
                          <Badge variant={row.onTrack ? 'success' : 'warning'}>
                            {row.onTrack ? 'No ritmo' : 'Abaixo'}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                              Remover
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
