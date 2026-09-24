import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chainService, feedService, FeedEntry } from '../services/commercialService';
import { industryService } from '../services/industryService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';

export default function FeedPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'DONE' | ''>('OPEN');
  const [form, setForm] = useState({
    type: 'PENDING' as FeedEntry['type'],
    title: '',
    body: '',
    chainId: '',
    industryId: '',
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['feed', statusFilter],
    queryFn: () =>
      feedService.list({
        status: statusFilter || undefined,
        limit: 80,
      }),
  });

  const { data: chains = [] } = useQuery({
    queryKey: ['chains-active'],
    queryFn: () => chainService.list(true),
  });
  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: () => industryService.listIndustries(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      feedService.create({
        type: form.type,
        title: form.title,
        body: form.body || null,
        chainId: form.chainId || null,
        industryId: form.industryId || null,
      }),
    onSuccess: () => {
      toast.success('Publicado no feed');
      setForm((f) => ({ ...f, title: '', body: '' }));
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao publicar'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => feedService.patch(id, { status: 'DONE' }),
    onSuccess: () => {
      toast.success('Marcado como resolvido');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['feed-dashboard'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Feed compartilhado</h1>
        <p className="text-text-secondary text-sm mt-1">
          Registro de quem lançou o quê, notas e pendências visíveis a supervisores e admin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Nova entrada</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Tipo</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as FeedEntry['type'] }))
                }
              >
                <option value="PENDING">Pendência</option>
                <option value="NOTE">Nota</option>
                <option value="IMPORT">Importação (manual)</option>
                <option value="GOAL">Meta (manual)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Rede</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={form.chainId}
                onChange={(e) => setForm((f) => ({ ...f, chainId: e.target.value }))}
              >
                <option value="">—</option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Indústria</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={form.industryId}
                onChange={(e) => setForm((f) => ({ ...f, industryId: e.target.value }))}
              >
                <option value="">—</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Título"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Pedido Assaí SP atrasado"
            />
          </div>
          <textarea
            className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm min-h-[80px]"
            placeholder="Detalhes (opcional)"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <Button
            disabled={!form.title || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Publicar
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(['OPEN', 'DONE', ''] as const).map((s) => (
          <Button
            key={s || 'all'}
            size="sm"
            variant={statusFilter === s ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'OPEN' ? 'Abertas' : s === 'DONE' ? 'Resolvidas' : 'Todas'}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          {isLoading ? (
            <p className="text-text-secondary">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-text-secondary">Nenhuma entrada.</p>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="p-3 rounded-lg border border-dark-border flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={e.status === 'OPEN' ? 'warning' : 'success'}>{e.type}</Badge>
                    <span className="font-medium text-text-primary">{e.title}</span>
                  </div>
                  {e.body && <p className="text-sm text-text-secondary mt-1">{e.body}</p>}
                  <div className="text-xs text-text-secondary mt-2">
                    {e.author?.name}
                    {e.chain?.name ? ` · ${e.chain.name}` : ''}
                    {e.industry?.name ? ` · ${e.industry.name}` : ''}
                    {' · '}
                    {new Date(e.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
                {e.status === 'OPEN' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolveMutation.mutate(e.id)}
                    disabled={resolveMutation.isPending}
                  >
                    Resolver
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
