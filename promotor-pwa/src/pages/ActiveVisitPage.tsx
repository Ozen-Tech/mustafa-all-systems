import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitStore } from '../stores/visitStore';
import { Task } from '../services/api';
import TaskCard from '../components/TaskCard';
import PhotoCapture from '../components/PhotoCapture';
import SyncStatusBar from '../components/SyncStatusBar';

export default function ActiveVisitPage() {
  const navigate = useNavigate();
  const { 
    activeVisit, 
    currentStoreTasks, 
    loadActiveVisit, 
    loadTasksForStore,
    finishCheckout,
    isLoading,
    pendingSync
  } = useVisitStore();

  const [activeTab, setActiveTab] = useState<'tarefas' | 'fotos'>('tarefas');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPhoto, setCheckoutPhoto] = useState<Blob | null>(null);
  const [checkoutPhotoPreview, setCheckoutPhotoPreview] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadActiveVisit();
  }, [loadActiveVisit]);

  useEffect(() => {
    if (activeVisit?.storeId) {
      loadTasksForStore(activeVisit.storeId);
    }
  }, [activeVisit?.storeId, loadTasksForStore]);

  // Se não há visita ativa, volta para lojas
  useEffect(() => {
    if (!isLoading && !activeVisit) {
      navigate('/');
    }
  }, [activeVisit, isLoading, navigate]);

  const handleTaskComplete = (taskId: string) => {
    setCompletedTasks(prev => new Set(prev).add(taskId));
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      // Tenta obter GPS
      let gpsLocation: GeolocationPosition | null = null;
      let gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable' = 'unavailable';

      try {
        gpsLocation = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          });
        });
        gpsStatus = 'ok';
      } catch {
        gpsStatus = 'timeout';
      }

      const result = await finishCheckout(checkoutPhoto, gpsLocation, gpsStatus);

      if (result.success) {
        navigate('/');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!activeVisit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingTasks = currentStoreTasks.filter(t => !completedTasks.has(t.id));
  const doneTasks = currentStoreTasks.filter(t => completedTasks.has(t.id));

  // Agrupa tarefas por tipo de alerta
  const groupedTasks = pendingTasks.reduce((acc, task) => {
    const group = acc.get(task.alertType) || [];
    group.push(task);
    acc.set(task.alertType, group);
    return acc;
  }, new Map<string, Task[]>());

  const alertTypeLabels: Record<string, { label: string; emoji: string; priority: number }> = {
    'ruptura_com_cd': { label: 'Ruptura com CD', emoji: '🔴', priority: 1 },
    'cd_zerado': { label: 'CD Zerado', emoji: '⚫', priority: 2 },
    'parado_30d': { label: 'Parado 30 dias', emoji: '⏸️', priority: 3 },
    'negativo': { label: 'Estoque Negativo', emoji: '📉', priority: 4 },
    'excesso_dde90': { label: 'Excesso DDE>90', emoji: '📦', priority: 5 },
    'cobertura_baixa': { label: 'Cobertura Baixa', emoji: '📊', priority: 6 },
  };

  const sortedAlertTypes = Array.from(groupedTasks.keys()).sort(
    (a, b) => (alertTypeLabels[a]?.priority || 99) - (alertTypeLabels[b]?.priority || 99)
  );

  if (showCheckout) {
    return (
      <div className="min-h-screen pb-6">
        <div className="sticky top-0 bg-dark-bg z-10 p-4 border-b border-dark-border">
          <button 
            onClick={() => setShowCheckout(false)}
            className="text-gray-400 mb-2 flex items-center gap-1"
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-bold">Checkout</h1>
          <p className="text-sm text-gray-400">Finalize sua visita</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Resumo */}
          <div className="card">
            <h3 className="font-medium mb-3">Resumo da Visita</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Loja</span>
                <span>{activeVisit.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Check-in</span>
                <span>{new Date(activeVisit.checkInAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tarefas concluídas</span>
                <span>{completedTasks.size}/{currentStoreTasks.length}</span>
              </div>
              {pendingSync.total > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>Pendentes de sync</span>
                  <span>{pendingSync.total}</span>
                </div>
              )}
            </div>
          </div>

          {/* Foto de checkout */}
          <div className="card">
            <h3 className="font-medium mb-3">Foto de Checkout (opcional)</h3>
            
            {checkoutPhotoPreview ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <img src={checkoutPhotoPreview} alt="Checkout" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setCheckoutPhoto(null);
                      setCheckoutPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <PhotoCapture 
                onCapture={(blob, preview) => {
                  setCheckoutPhoto(blob);
                  setCheckoutPhotoPreview(preview);
                }} 
              />
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="btn-danger w-full"
          >
            {isCheckingOut ? 'Finalizando...' : '🚪 Finalizar Visita'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <SyncStatusBar />

      {/* Header */}
      <div className="sticky top-0 bg-dark-bg z-10 p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">{activeVisit.storeName}</h1>
            <p className="text-sm text-gray-400">
              Check-in: {new Date(activeVisit.checkInAt).toLocaleTimeString()}
              {activeVisit.gpsStatus !== 'ok' && (
                <span className="ml-2 text-yellow-400">• Sem GPS</span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'tarefas' 
                ? 'bg-primary text-white' 
                : 'bg-dark-elevated text-gray-400'
            }`}
          >
            📋 Tarefas ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('fotos')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'fotos' 
                ? 'bg-primary text-white' 
                : 'bg-dark-elevated text-gray-400'
            }`}
          >
            📷 Fotos
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {activeTab === 'tarefas' ? (
          <div className="space-y-6">
            {/* Tarefas pendentes agrupadas por tipo */}
            {sortedAlertTypes.map(alertType => {
              const tasks = groupedTasks.get(alertType) || [];
              const info = alertTypeLabels[alertType] || { label: alertType, emoji: '📌', priority: 99 };

              return (
                <div key={alertType}>
                  <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <span>{info.emoji}</span>
                    {info.label}
                    <span className="badge bg-dark-elevated">{tasks.length}</span>
                  </h2>
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onComplete={() => handleTaskComplete(task.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {pendingTasks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-gray-400">Todas as tarefas concluídas!</p>
              </div>
            )}

            {/* Tarefas concluídas */}
            {doneTasks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-medium text-gray-400 mb-3">
                  ✅ Concluídas ({doneTasks.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {doneTasks.map(task => (
                    <div key={task.id} className="card-elevated text-sm">
                      <span className="font-medium">{task.productName}</span>
                      <span className="text-gray-400 ml-2">{task.sku}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center py-4">
              Foto-comprovante apenas quando a indústria exigir book.
            </p>
            <PhotoCapture 
              onCapture={(blob, preview) => {
                console.log('Foto capturada:', blob.size, preview.substring(0, 50));
              }}
              label="Adicionar foto de evidência"
            />
          </div>
        )}
      </div>

      {/* Botão de checkout fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-bg border-t border-dark-border">
        <button
          onClick={() => setShowCheckout(true)}
          className="btn-accent w-full"
        >
          🚪 Fazer Checkout
        </button>
      </div>
    </div>
  );
}
