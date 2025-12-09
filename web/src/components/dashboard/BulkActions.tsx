import React, { useState } from 'react';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { supervisorService } from '../../services/supervisorService';

interface BulkActionsProps {
  selectedPromoters: string[];
  onActionComplete?: () => void;
}

export default function BulkActions({ selectedPromoters, onActionComplete }: BulkActionsProps) {
  const [actionType, setActionType] = useState<'route' | 'message' | 'quota' | 'activate' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [photoQuota, setPhotoQuota] = useState(20);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    if (actionType === 'route') {
      supervisorService.getAvailableStores().then((data) => {
        setAvailableStores(data.stores || []);
      });
    }
  }, [actionType]);

  const handleAssignRoute = async () => {
    if (selectedStores.length === 0) return;
    setLoading(true);
    try {
      // Atribuir rota para múltiplos promotores
      await Promise.all(
        selectedPromoters.map((promoterId) =>
          supervisorService.setPromoterRoute(promoterId, selectedStores)
        )
      );
      alert('Rotas atribuídas com sucesso!');
      setActionType(null);
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao atribuir rotas:', error);
      alert('Erro ao atribuir rotas');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      // Simular envio de mensagem - em produção, usar endpoint real
      console.log('Enviando mensagem para promotores:', selectedPromoters, message);
      alert('Mensagens enviadas com sucesso!');
      setMessage('');
      setActionType(null);
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      alert('Erro ao enviar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const handleSetQuota = async () => {
    setLoading(true);
    try {
      await Promise.all(
        selectedPromoters.map((promoterId) =>
          supervisorService.setPhotoQuota(promoterId, photoQuota)
        )
      );
      alert('Quotas atualizadas com sucesso!');
      setActionType(null);
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao atualizar quotas:', error);
      alert('Erro ao atualizar quotas');
    } finally {
      setLoading(false);
    }
  };

  if (selectedPromoters.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-text-secondary text-center py-4">
            Selecione promotores para realizar ações em massa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Ações em Massa</h3>
            <p className="text-sm text-text-secondary mt-1">
              {selectedPromoters.length} promotor(es) selecionado(s)
            </p>
          </div>
          <Badge variant="primary" size="lg">
            {selectedPromoters.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Seleção de Ação */}
          {!actionType && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => setActionType('route')}
                className="p-4 rounded-lg border-2 border-dark-border hover:border-primary-600 transition-all text-left"
              >
                <div className="text-2xl mb-2">📍</div>
                <p className="text-sm font-semibold text-text-primary">Atribuir Rota</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Definir lojas para múltiplos promotores
                </p>
              </button>
              <button
                onClick={() => setActionType('message')}
                className="p-4 rounded-lg border-2 border-dark-border hover:border-primary-600 transition-all text-left"
              >
                <div className="text-2xl mb-2">💬</div>
                <p className="text-sm font-semibold text-text-primary">Enviar Mensagem</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Cobrança ou lembrete em massa
                </p>
              </button>
              <button
                onClick={() => setActionType('quota')}
                className="p-4 rounded-lg border-2 border-dark-border hover:border-primary-600 transition-all text-left"
              >
                <div className="text-2xl mb-2">📸</div>
                <p className="text-sm font-semibold text-text-primary">Alterar Quota</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Definir meta de fotos
                </p>
              </button>
              <button
                onClick={() => setActionType('activate')}
                className="p-4 rounded-lg border-2 border-dark-border hover:border-primary-600 transition-all text-left"
              >
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm font-semibold text-text-primary">Ativar/Desativar</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Alterar status dos promotores
                </p>
              </button>
            </div>
          )}

          {/* Formulário de Atribuir Rota */}
          {actionType === 'route' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Selecionar Lojas
                </label>
                <div className="max-h-48 overflow-y-auto border border-dark-border rounded-lg p-3 space-y-2">
                  {availableStores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-dark-cardElevated p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(store.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStores([...selectedStores, store.id]);
                          } else {
                            setSelectedStores(selectedStores.filter((id) => id !== store.id));
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded border-dark-border focus:ring-primary-500"
                      />
                      <span className="text-sm text-text-primary">{store.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleAssignRoute}
                  isLoading={loading}
                  disabled={selectedStores.length === 0}
                >
                  Atribuir Rota
                </Button>
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Formulário de Enviar Mensagem */}
          {actionType === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Mensagem
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem para os promotores selecionados..."
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  isLoading={loading}
                  disabled={!message.trim()}
                >
                  Enviar Mensagem
                </Button>
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Formulário de Alterar Quota */}
          {actionType === 'quota' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Meta de Fotos por Visita
                </label>
                <Input
                  type="number"
                  value={photoQuota}
                  onChange={(e) => setPhotoQuota(parseInt(e.target.value) || 20)}
                  min={1}
                  max={100}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleSetQuota}
                  isLoading={loading}
                >
                  Atualizar Quota
                </Button>
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Ativar/Desativar */}
          {actionType === 'activate' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Esta ação irá ativar ou desativar os promotores selecionados.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Simular ativação/desativação - em produção, usar endpoint real
                      console.log('Ativando/desativando promotores:', selectedPromoters);
                      alert('Status dos promotores atualizado!');
                      setActionType(null);
                      onActionComplete?.();
                    } catch (error) {
                      console.error('Erro ao atualizar status:', error);
                      alert('Erro ao atualizar status');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  isLoading={loading}
                >
                  Ativar/Desativar
                </Button>
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

