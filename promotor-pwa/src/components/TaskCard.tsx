import { useState } from 'react';
import { Task } from '../services/api';
import { useVisitStore } from '../stores/visitStore';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
}

type TaskAction = 'na_gondola' | 'ruptura' | 'deposito' | 'preco_ok' | 'preco_divergente';
type RuptureReason = 'tem_cd' | 'cd_zerado' | 'sem_pedido' | 'bloqueado';
type ActionTaken = 'pedido' | 'ponto_extra' | 'cartaz' | 'troca_preco';

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const { completeTask } = useVisitStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<TaskAction | null>(null);
  const [priceFound, setPriceFound] = useState('');
  const [ruptureReason, setRuptureReason] = useState<RuptureReason | null>(null);
  const [actionTaken, setActionTaken] = useState<ActionTaken | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getAlertColor = () => {
    switch (task.alertType) {
      case 'ruptura_com_cd':
        return 'task-ruptura';
      case 'cd_zerado':
        return 'bg-gray-700/40 border-gray-600';
      case 'parado_30d':
        return 'bg-yellow-500/20 border-yellow-500/40';
      case 'cobertura_baixa':
        return 'task-cobertura-baixa';
      default:
        return 'bg-dark-elevated border-dark-border';
    }
  };

  const handleSave = async () => {
    if (!selectedAction) return;

    setIsSaving(true);

    try {
      const details: Record<string, unknown> = {};
      
      if (selectedAction === 'preco_divergente' && priceFound) {
        details.priceFound = parseFloat(priceFound);
      }
      if (selectedAction === 'ruptura' && ruptureReason) {
        details.ruptureReason = ruptureReason;
      }
      if (actionTaken) {
        details.actionTaken = actionTaken;
      }

      await completeTask(task, selectedAction, details);
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const actions: { value: TaskAction; label: string; emoji: string }[] = [
    { value: 'na_gondola', label: 'Na gôndola', emoji: '✅' },
    { value: 'ruptura', label: 'Ruptura', emoji: '🔴' },
    { value: 'deposito', label: 'No depósito', emoji: '📦' },
    { value: 'preco_ok', label: 'Preço OK', emoji: '💰' },
    { value: 'preco_divergente', label: 'Preço divergente', emoji: '⚠️' },
  ];

  const ruptureReasons: { value: RuptureReason; label: string }[] = [
    { value: 'tem_cd', label: 'Tem no CD' },
    { value: 'cd_zerado', label: 'CD zerado' },
    { value: 'sem_pedido', label: 'Sem pedido' },
    { value: 'bloqueado', label: 'Bloqueado' },
  ];

  const actionOptions: { value: ActionTaken; label: string }[] = [
    { value: 'pedido', label: 'Fiz pedido' },
    { value: 'ponto_extra', label: 'Ponto extra' },
    { value: 'cartaz', label: 'Cartaz' },
    { value: 'troca_preco', label: 'Troca de preço' },
  ];

  return (
    <div className={`card border ${getAlertColor()}`}>
      {/* Header - sempre visível */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{task.productName}</p>
            <p className="text-sm text-gray-400">
              {task.sku} • {task.industryName}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`badge ${task.stockLoja <= 0 ? 'badge-danger' : 'badge-success'}`}>
                Loja: {task.stockLoja}
              </span>
              <span className={`badge ${task.stockCD <= 0 ? 'badge-danger' : 'badge-info'}`}>
                CD: {task.stockCD}
              </span>
              {task.dde && (
                <span className={`badge ${task.dde > 90 ? 'badge-warning' : 'badge-info'}`}>
                  DDE: {task.dde}
                </span>
              )}
            </div>
          </div>
          <div className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dark-border space-y-4">
          {/* Ações principais */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Situação do produto:</p>
            <div className="grid grid-cols-2 gap-2">
              {actions.map(action => (
                <button
                  key={action.value}
                  onClick={() => setSelectedAction(action.value)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    selectedAction === action.value
                      ? 'bg-primary text-white'
                      : 'bg-dark-elevated text-gray-300 hover:bg-dark-border'
                  }`}
                >
                  {action.emoji} {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos adicionais baseados na ação */}
          {selectedAction === 'preco_divergente' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Preço encontrado:</label>
              <input
                type="number"
                step="0.01"
                value={priceFound}
                onChange={(e) => setPriceFound(e.target.value)}
                placeholder="0,00"
                className="input"
              />
            </div>
          )}

          {selectedAction === 'ruptura' && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Causa da ruptura:</p>
              <div className="grid grid-cols-2 gap-2">
                {ruptureReasons.map(reason => (
                  <button
                    key={reason.value}
                    onClick={() => setRuptureReason(reason.value)}
                    className={`p-2 rounded-lg text-sm ${
                      ruptureReason === reason.value
                        ? 'bg-red-500/30 border border-red-500 text-white'
                        : 'bg-dark-elevated text-gray-300'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ação tomada */}
          {selectedAction && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Ação tomada (opcional):</p>
              <div className="flex flex-wrap gap-2">
                {actionOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setActionTaken(actionTaken === option.value ? null : option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      actionTaken === option.value
                        ? 'bg-accent text-dark-bg'
                        : 'bg-dark-elevated text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão salvar */}
          {selectedAction && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary w-full"
            >
              {isSaving ? 'Salvando...' : '✓ Confirmar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
