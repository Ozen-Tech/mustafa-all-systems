import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService, StockImport as StockImportType, UnmatchedFilial } from '../services/stockService';
import { supervisorService } from '../services/supervisorService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

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
      queryClient.invalidateQueries({ queryKey: ['stock-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['stores-for-linking'] });
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    for (const file of list) {
      const idx = uploads.length;
      setUploads((prev) => [
        ...prev,
        { fileName: file.name, status: 'uploading', progress: 0 },
      ]);
      const update = (patch: Partial<UploadState>) =>
        setUploads((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));

      try {
        await stockService.uploadImport(file, (pct) => {
          update({ progress: pct, status: pct >= 100 ? 'processing' : 'uploading' });
        });
        update({ status: 'done', progress: 100, message: 'Importado' });
      } catch (error: any) {
        update({
          status: 'error',
          message: error?.response?.data?.message || 'Erro ao importar',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['stock-imports'] });
      queryClient.invalidateQueries({ queryKey: ['stock-unmatched'] });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Importar Estoque e Vendas</h1>
        <p className="text-text-secondary mt-1">
          Envie os relatórios semanais do Mateus (.xlsx). O sistema extrai estoque por loja, estoque
          dos CDs e vendas automaticamente.
        </p>
      </div>

      {/* Upload */}
      <Card>
        <CardContent>
          <div
            className="border-2 border-dashed border-dark-border rounded-xl p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <p className="text-text-secondary mb-4">
              Arraste os arquivos .xlsx aqui ou selecione vários de uma vez.
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
            <p className="text-xs text-text-tertiary mt-3">
              Cada arquivo pode levar 1-2 minutos para processar.
            </p>
          </div>

          {uploads.length > 0 && (
            <div className="mt-6 space-y-2">
              {uploads.map((u, i) => (
                <div
                  key={`${u.fileName}-${i}`}
                  className="flex items-center justify-between bg-dark-backgroundSecondary rounded-lg px-4 py-2"
                >
                  <span className="text-text-primary text-sm truncate flex-1">{u.fileName}</span>
                  <div className="flex items-center gap-3">
                    {u.status === 'uploading' && (
                      <span className="text-xs text-text-tertiary">Enviando {u.progress}%</span>
                    )}
                    {u.status === 'processing' && (
                      <span className="text-xs text-warning-500">Processando...</span>
                    )}
                    {u.status === 'done' && <Badge variant="success">OK</Badge>}
                    {u.status === 'error' && (
                      <Badge variant="error">{u.message || 'Erro'}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-tertiary text-left border-b border-dark-border">
                    <th className="py-2 pr-4">Arquivo</th>
                    <th className="py-2 pr-4">Semana</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Estoque</th>
                    <th className="py-2 pr-4">Vendas</th>
                    <th className="py-2 pr-4">Indústrias</th>
                    <th className="py-2 pr-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr key={imp.id} className="border-b border-dark-border/50">
                      <td className="py-2 pr-4 text-text-primary">{imp.fileName}</td>
                      <td className="py-2 pr-4 text-text-secondary">{imp.weekLabel || '-'}</td>
                      <td className="py-2 pr-4">{statusBadge(imp.status)}</td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {imp.stockRowCount.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {imp.salesRowCount.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-text-tertiary text-xs max-w-xs truncate">
                        {imp.industries.join(', ')}
                      </td>
                      <td className="py-2 pr-4 text-text-tertiary text-xs">
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

      {/* Filiais não vinculadas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Filiais não vinculadas a lojas</h2>
            <Badge variant="gray">{unmatched.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-text-tertiary text-sm mb-4">
            Vincule as filiais dos relatórios às lojas cadastradas para que os promotores vejam o
            estoque da loja deles.
          </p>
          {unmatched.length === 0 ? (
            <div className="text-text-tertiary">Todas as filiais com estoque estão vinculadas.</div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {unmatched.map((f: UnmatchedFilial) => (
                <div
                  key={f.filialCode}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 bg-dark-backgroundSecondary rounded-lg px-4 py-2"
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
