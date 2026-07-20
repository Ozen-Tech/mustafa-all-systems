import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService, StockImport as StockImportType, UnmatchedFilial } from '../services/stockService';
import { supervisorService } from '../services/supervisorService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';

interface UploadState {
  fileName: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  message?: string;
}

function statusBadge(status: StockImportType['status']) {
  if (status === 'DONE') return <Badge variant="success">Concluído</Badge>;
  if (status === 'PROCESSING') return <Badge variant="warning">Processando</Badge>;
  return <Badge variant="error">Falhou</Badge>;
}

export default function StockImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  const { data: imports = [], isLoading: loadingImports } = useQuery({
    queryKey: ['stock-imports'],
    queryFn: () => stockService.listImports(),
    refetchInterval: (query) => {
      const data = query.state.data as StockImportType[] | undefined;
      return data?.some((i) => i.status === 'PROCESSING') ? 4000 : false;
    },
  });

  const { data: unmatched = [] } = useQuery({
    queryKey: ['stock-unmatched'],
    queryFn: () => stockService.getUnmatchedFiliais(),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores-for-linking'],
    queryFn: () => supervisorService.getAllStores(),
  });

  const stores = useMemo(() => {
    const raw: any = storesData;
    const list = Array.isArray(raw) ? raw : raw?.stores || [];
    return list as Array<{ id: string; name: string; code?: string; filialCode?: string; state?: string }>;
  }, [storesData]);

  const linkMutation = useMutation({
    mutationFn: ({ storeId, filialCode }: { storeId: string; filialCode: string }) =>
      stockService.linkFilial(storeId, filialCode),
    onSuccess: () => {
      toast.success('Filial vinculada à loja');
      queryClient.invalidateQueries({ queryKey: ['stock-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['stores-for-linking'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao vincular'),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    for (const file of list) {
      setUploads((prev) => [...prev, { fileName: file.name, status: 'uploading', progress: 0 }]);

      const updateLast = (patch: Partial<UploadState>) =>
        setUploads((prev) => {
          const copy = [...prev];
          const idx = copy.length - 1;
          if (idx >= 0) copy[idx] = { ...copy[idx], ...patch };
          return copy;
        });

      try {
        await stockService.uploadImport(file, (pct) => {
          updateLast({ progress: pct, status: pct >= 100 ? 'processing' : 'uploading' });
        });
        updateLast({ status: 'done', progress: 100, message: 'Importado' });
        toast.success(`Relatório importado: ${file.name}`);
      } catch (error: any) {
        updateLast({
          status: 'error',
          message: error?.response?.data?.message || 'Erro ao importar',
        });
        toast.error(error?.response?.data?.message || `Falha ao importar ${file.name}`);
      }
      queryClient.invalidateQueries({ queryKey: ['stock-imports'] });
      queryClient.invalidateQueries({ queryKey: ['stock-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Importar Relatório Mateus</h1>
          <p className="page-subtitle">
            Envie o Excel semanal (abas ESTOQUE E VENDA, VENDA GERAL, ESTOQUE CD…). O sistema extrai
            estoque por loja/CD e vendas por indústria automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/stock">
            <Button variant="outline">Ver no dashboard</Button>
          </Link>
          <Link to="/information">
            <Button variant="accent">Publicar para promotores</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent>
          <div
            className="border border-dashed border-dark-borderLight rounded-2xl p-8 text-center bg-dark-backgroundSecondary/40 hover:border-primary-500/40 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <p className="text-text-secondary mb-1 font-medium">Arraste o arquivo .xlsx aqui</p>
            <p className="text-text-tertiary text-sm mb-5">
              Ex.: VENDAS MUSTAFA — estoque + vendas no mesmo arquivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button onClick={() => fileInputRef.current?.click()}>Selecionar arquivos</Button>
            <p className="text-xs text-text-disabled mt-3">
              Processamento pode levar 1–2 minutos por arquivo (arquivo grande).
            </p>
          </div>

          {uploads.length > 0 && (
            <div className="mt-6 space-y-2">
              {uploads.map((u, i) => (
                <div
                  key={`${u.fileName}-${i}`}
                  className="flex items-center justify-between bg-dark-backgroundSecondary rounded-xl px-4 py-2.5 border border-dark-border"
                >
                  <span className="text-text-primary text-sm truncate flex-1">{u.fileName}</span>
                  <div className="flex items-center gap-3">
                    {u.status === 'uploading' && (
                      <span className="text-xs text-text-tertiary">Enviando {u.progress}%</span>
                    )}
                    {u.status === 'processing' && (
                      <span className="text-xs text-warning-400">Processando…</span>
                    )}
                    {u.status === 'done' && <Badge variant="success">OK</Badge>}
                    {u.status === 'error' && <Badge variant="error">{u.message || 'Erro'}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Histórico de importações</h2>
        </CardHeader>
        <CardContent>
          {loadingImports ? (
            <div className="text-text-secondary">Carregando...</div>
          ) : imports.length === 0 ? (
            <div className="text-text-tertiary">Nenhuma importação ainda.</div>
          ) : (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Semana</th>
                    <th>Status</th>
                    <th>Estoque</th>
                    <th>Vendas</th>
                    <th>Indústrias</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr key={imp.id}>
                      <td className="text-text-primary">{imp.fileName}</td>
                      <td>{imp.weekLabel || '-'}</td>
                      <td>{statusBadge(imp.status)}</td>
                      <td>{imp.stockRowCount.toLocaleString('pt-BR')}</td>
                      <td>{imp.salesRowCount.toLocaleString('pt-BR')}</td>
                      <td className="text-text-tertiary text-xs max-w-xs truncate">
                        {imp.industries.join(', ')}
                      </td>
                      <td className="text-text-tertiary text-xs">
                        {new Date(imp.createdAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Filiais não vinculadas a lojas</h2>
            <Badge variant="gray">{unmatched.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-text-tertiary text-sm mb-4">
            Vincule as filiais dos relatórios às lojas cadastradas para o promotor ver estoque e vendas
            da loja dele.
          </p>
          {unmatched.length === 0 ? (
            <div className="text-text-tertiary">Todas as filiais com estoque estão vinculadas.</div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-dark">
              {unmatched.map((f: UnmatchedFilial) => (
                <div
                  key={f.filialCode}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 bg-dark-backgroundSecondary rounded-xl px-4 py-2.5 border border-dark-border"
                >
                  <div className="flex-1">
                    <span className="text-text-primary text-sm">
                      [{f.filialCode}] {f.filialName}
                    </span>
                    <span className="text-text-tertiary text-xs ml-2">
                      {f.state || ''} · {f.items} itens
                    </span>
                  </div>
                  <select
                    value={linkSelections[f.filialCode] || ''}
                    onChange={(e) =>
                      setLinkSelections((prev) => ({ ...prev, [f.filialCode]: e.target.value }))
                    }
                    className="px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-text-primary text-sm"
                  >
                    <option value="">Selecionar loja...</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={linkMutation.isPending}
                    disabled={!linkSelections[f.filialCode]}
                    onClick={() =>
                      linkMutation.mutate({
                        storeId: linkSelections[f.filialCode],
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
