import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  chainService,
  RetailChain,
} from '../services/commercialService';
import { supervisorService } from '../services/supervisorService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';
import { useConfirm } from '../hooks/useConfirm';

export default function ChainsManagement() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: '', code: '' });
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [linkStoreId, setLinkStoreId] = useState('');

  const { data: chains = [], isLoading } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainService.list(),
  });

  const { data: chainDetail } = useQuery({
    queryKey: ['chain', selectedChainId],
    queryFn: () => chainService.get(selectedChainId),
    enabled: !!selectedChainId,
  });

  const { data: unlinked = [] } = useQuery({
    queryKey: ['unlinked-stores'],
    queryFn: () => chainService.unlinkedStores(),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-all'],
    queryFn: () => supervisorService.getAllStores(),
  });

  const stores = useMemo(() => {
    const raw: any = storesData;
    return (Array.isArray(raw) ? raw : raw?.stores || []) as Array<{
      id: string;
      name: string;
      code?: string;
      state?: string;
    }>;
  }, [storesData]);

  const createMutation = useMutation({
    mutationFn: () => chainService.create({ name: form.name, code: form.code }),
    onSuccess: () => {
      toast.success('Rede criada');
      setForm({ name: '', code: '' });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar rede'),
  });

  const linkMutation = useMutation({
    mutationFn: () => chainService.linkStore(selectedChainId, linkStoreId),
    onSuccess: () => {
      toast.success('Loja vinculada');
      setLinkStoreId('');
      queryClient.invalidateQueries({ queryKey: ['chain', selectedChainId] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-stores'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao vincular'),
  });

  const unlinkMutation = useMutation({
    mutationFn: (storeId: string) => chainService.unlinkStore(storeId),
    onSuccess: () => {
      toast.success('Vínculo removido');
      queryClient.invalidateQueries({ queryKey: ['chain', selectedChainId] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-stores'] });
    },
  });

  async function handleDelete(chain: RetailChain) {
    const ok = await confirm({
      title: 'Excluir rede?',
      description: `Remover ${chain.name}? Pedidos vinculados também serão afetados.`,
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await chainService.remove(chain.id);
      toast.success('Rede removida');
      if (selectedChainId === chain.id) setSelectedChainId('');
      queryClient.invalidateQueries({ queryKey: ['chains'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao remover');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Redes varejistas</h1>
        <p className="text-text-secondary text-sm mt-1">
          Cadastre Mateus, Assaí, Atacadão e vincule as lojas — pré-requisito de metas e pedidos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Nova rede</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Mateus"
            />
            <Input
              label="Código"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: MATEUS"
            />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.code || createMutation.isPending}
              className="w-full"
            >
              Criar rede
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Redes cadastradas</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-text-secondary">Carregando...</p>
            ) : chains.length === 0 ? (
              <p className="text-text-secondary">Nenhuma rede ainda.</p>
            ) : (
              <div className="space-y-2">
                {chains.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                      selectedChainId === c.id
                        ? 'border-primary-500 bg-primary-600/10'
                        : 'border-dark-border hover:border-primary-600/40'
                    }`}
                    onClick={() => setSelectedChainId(c.id)}
                  >
                    <div>
                      <div className="font-medium text-text-primary">{c.name}</div>
                      <div className="text-xs text-text-secondary">
                        {c.code} · {c._count?.stores ?? 0} lojas · {c._count?.purchaseOrders ?? 0}{' '}
                        pedidos
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.isActive ? 'success' : 'warning'}>
                        {c.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c);
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedChainId && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-text-primary">
              Lojas de {chainDetail?.name || '...'}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="flex-1 bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={linkStoreId}
                onChange={(e) => setLinkStoreId(e.target.value)}
              >
                <option value="">Selecionar loja para vincular...</option>
                {(unlinked.length ? unlinked : stores).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                    {s.state ? ` — ${s.state}` : ''}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => linkMutation.mutate()}
                disabled={!linkStoreId || linkMutation.isPending}
              >
                Vincular
              </Button>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(chainDetail?.stores || []).length === 0 ? (
                <p className="text-text-secondary text-sm">Nenhuma loja vinculada.</p>
              ) : (
                (chainDetail?.stores || []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 px-3 rounded border border-dark-border"
                  >
                    <div>
                      <div className="text-sm text-text-primary">{s.name}</div>
                      <div className="text-xs text-text-secondary">
                        {[s.code, s.filialCode, s.state].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkMutation.mutate(s.id)}
                    >
                      Desvincular
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
