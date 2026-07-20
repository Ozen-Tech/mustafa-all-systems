import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { informationService, InformationType } from '../services/informationService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useConfirm } from '../hooks/useConfirm';
import { toast } from '../components/ui/Toaster';

const typeLabel: Record<InformationType, string> = {
  estoque: 'Estoque/Vendas',
  produto: 'Produto',
  geral: 'Geral',
};

export default function InformationHub() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<InformationType>('estoque');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['informations'],
    queryFn: () => informationService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => informationService.create({ title, content, type }),
    onSuccess: () => {
      toast.success('Informação publicada para os promotores');
      setShowCreate(false);
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['informations'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao publicar'),
  });

  const publishMutation = useMutation({
    mutationFn: () => informationService.publishStockSummary(),
    onSuccess: () => {
      toast.success('Resumo Mateus publicado na Central de Informações');
      queryClient.invalidateQueries({ queryKey: ['informations'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao gerar resumo'),
  });

  async function toggleActive(id: string, isActive: boolean, itemTitle: string) {
    const ok = await confirm({
      title: isActive ? 'Desativar informação?' : 'Reativar informação?',
      description: `"${itemTitle}" ${isActive ? 'deixará de aparecer' : 'voltará a aparecer'} na tab Informações do app do promotor.`,
      variant: isActive ? 'warning' : 'info',
      confirmLabel: isActive ? 'Desativar' : 'Reativar',
    });
    if (!ok) return;
    try {
      await informationService.setActive(id, !isActive);
      toast.success(isActive ? 'Informação desativada' : 'Informação reativada');
      queryClient.invalidateQueries({ queryKey: ['informations'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar');
    }
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Informações para Promotores</h1>
          <p className="page-subtitle">
            Publique avisos e resumos de vendas/estoque que aparecem na tab Informações do app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => publishMutation.mutate()}
            isLoading={publishMutation.isPending}
          >
            Gerar resumo Mateus
          </Button>
          <Button onClick={() => setShowCreate(true)}>Nova informação</Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm text-text-tertiary">
            <span>
              Após importar o Excel em{' '}
              <Link to="/stock/import" className="text-primary-400 hover:underline">
                Importar Relatório Mateus
              </Link>
              , use “Gerar resumo Mateus” para publicar o ranking de vendas.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Publicações</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-text-tertiary">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-text-tertiary">Nenhuma informação publicada ainda.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-dark-border bg-dark-backgroundSecondary/50 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary truncate">{item.title}</h3>
                      <Badge variant={item.isActive ? 'success' : 'gray'}>
                        {item.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Badge variant="primary">{typeLabel[item.type]}</Badge>
                    </div>
                    <p className="text-sm text-text-tertiary whitespace-pre-line line-clamp-4">
                      {item.geminiSummary || item.content || 'Sem conteúdo'}
                    </p>
                    <p className="text-xs text-text-disabled mt-2">
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(item.id, item.isActive, item.title)}
                  >
                    {item.isActive ? 'Desativar' : 'Reativar'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nova informação"
        description="Será exibida para todos os promotores (escopo geral)."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              isLoading={createMutation.isPending}
              disabled={!title.trim()}
            >
              Publicar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Título</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-dark-cardElevated border border-dark-border text-text-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Prioridade de reposição — semana 16/07"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Tipo</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-dark-cardElevated border border-dark-border text-text-primary"
              value={type}
              onChange={(e) => setType(e.target.value as InformationType)}
            >
              <option value="estoque">Estoque/Vendas</option>
              <option value="produto">Produto</option>
              <option value="geral">Geral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Conteúdo</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-dark-cardElevated border border-dark-border text-text-primary min-h-[140px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texto que o promotor verá no app…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
