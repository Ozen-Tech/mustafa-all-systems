import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  chainService,
  currentPeriod,
  orderService,
  OrderImport,
} from '../services/commercialService';
import { stockService } from '../services/stockService';
import { supervisorService } from '../services/supervisorService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';

function statusBadge(status: OrderImport['status']) {
  if (status === 'DONE') return <Badge variant="success">Concluído</Badge>;
  if (status === 'PROCESSING') return <Badge variant="warning">Processando</Badge>;
  return <Badge variant="error">Falhou</Badge>;
}

export default function OrdersImport() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [chainId, setChainId] = useState('');
  const [periodLabel, setPeriodLabel] = useState(currentPeriod());
  const [uploading, setUploading] = useState(false);
  const [linkStoreId, setLinkStoreId] = useState<Record<string, string>>({});

  const { data: chains = [] } = useQuery({
    queryKey: ['chains'],
    queryFn: () => chainService.list(true),
  });

  const { data: imports = [], isLoading } = useQuery({
    queryKey: ['order-imports'],
    queryFn: () => orderService.listImports(),
  });

  const { data: unmatched = [] } = useQuery({
    queryKey: ['order-unmatched', chainId],
    queryFn: () => orderService.unmatchedFiliais(chainId || undefined),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-linking'],
    queryFn: () => supervisorService.getAllStores(),
  });
  const stores = (Array.isArray(storesData) ? storesData : (storesData as any)?.stores || []) as Array<{
    id: string;
    name: string;
    code?: string;
  }>;

  const linkMutation = useMutation({
    mutationFn: async ({ storeId, filialCode }: { storeId: string; filialCode: string }) => {
      await stockService.linkFilial(storeId, filialCode);
      if (chainId) await chainService.linkStore(chainId, storeId);
    },
    onSuccess: () => {
      toast.success('Filial vinculada');
      queryClient.invalidateQueries({ queryKey: ['order-unmatched'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao vincular'),
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!chainId) {
      toast.error('Selecione a rede antes de importar');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await orderService.upload(file, chainId, periodLabel || undefined);
        toast.success(`Importado: ${file.name}`);
      }
      queryClient.invalidateQueries({ queryKey: ['order-imports'] });
      queryClient.invalidateQueries({ queryKey: ['order-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['feed-dashboard'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha na importação');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Importar pedidos</h1>
          <p className="text-text-secondary text-sm mt-1">
            Envie a planilha da rede. O layout de colunas vem do cadastro da rede.
          </p>
        </div>
        <Link to="/pedidos">
          <Button variant="ghost">Voltar à lista</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Upload</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Rede *</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Período (rótulo)"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="2026-08"
            />
            <div className="flex items-end">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button
                className="w-full"
                disabled={!chainId || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Importando...' : 'Escolher arquivo Excel'}
              </Button>
            </div>
          </div>
          {!chains.length && (
            <p className="text-sm text-accent-400">
              Cadastre uma rede em <Link className="underline" to="/redes">/redes</Link> antes.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Histórico de importações</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-text-secondary">Carregando...</p>
          ) : imports.length === 0 ? (
            <p className="text-text-secondary">Nenhuma importação ainda.</p>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-dark-border"
                >
                  <div>
                    <div className="font-medium text-text-primary">{imp.fileName}</div>
                    <div className="text-xs text-text-secondary">
                      {imp.chain?.name} · {imp.periodLabel || '—'} · {imp.orderCount} pedidos ·{' '}
                      {imp.rowCount} linhas ·{' '}
                      {new Date(imp.createdAt).toLocaleString('pt-BR')}
                    </div>
                    {imp.errorMessage && (
                      <div className="text-xs text-red-400 mt-1">{imp.errorMessage}</div>
                    )}
                  </div>
                  {statusBadge(imp.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Filiais não reconhecidas</h2>
        </CardHeader>
        <CardContent>
          {unmatched.length === 0 ? (
            <p className="text-text-secondary text-sm">Todas as filiais estão vinculadas.</p>
          ) : (
            <div className="space-y-2">
              {unmatched.map((f) => (
                <div
                  key={`${f.chainId}-${f.filialCode}`}
                  className="flex flex-col md:flex-row md:items-center gap-2 p-3 border border-dark-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm text-text-primary">
                      [{f.filialCode}] {f.filialName}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {f.orderCount} pedido(s){f.state ? ` · ${f.state}` : ''}
                    </div>
                  </div>
                  <select
                    className="flex-1 bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary text-sm"
                    value={linkStoreId[f.filialCode] || ''}
                    onChange={(e) =>
                      setLinkStoreId((prev) => ({ ...prev, [f.filialCode]: e.target.value }))
                    }
                  >
                    <option value="">Vincular à loja...</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!linkStoreId[f.filialCode] || linkMutation.isPending}
                    onClick={() =>
                      linkMutation.mutate({
                        storeId: linkStoreId[f.filialCode],
                        filialCode: f.filialCode,
                      })
                    }
                  >
                    Vincular
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
