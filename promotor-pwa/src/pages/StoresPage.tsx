import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisitStore } from '../stores/visitStore';
import { Store } from '../services/api';
import SyncStatusBar from '../components/SyncStatusBar';

export default function StoresPage() {
  const navigate = useNavigate();
  const { 
    stores, 
    completedStoreIds, 
    activeVisit, 
    isLoading, 
    loadStores, 
    loadActiveVisit,
    isOnline 
  } = useVisitStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStores();
    loadActiveVisit();
  }, [loadStores, loadActiveVisit]);

  // Se há visita ativa, redireciona para ela
  useEffect(() => {
    if (activeVisit) {
      navigate('/visita');
    }
  }, [activeVisit, navigate]);

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(search.toLowerCase()) ||
    store.code?.toLowerCase().includes(search.toLowerCase()) ||
    store.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectStore = (store: Store) => {
    navigate(`/checkin/${store.id}`, { state: { store } });
  };

  const isCompleted = (storeId: string) => completedStoreIds.includes(storeId);

  if (isLoading && stores.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Carregando lojas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <SyncStatusBar />

      {/* Header */}
      <div className="sticky top-0 bg-dark-bg z-10 p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Minhas Lojas</h1>
            <p className="text-sm text-gray-400">
              {completedStoreIds.length}/{stores.length} visitadas hoje
            </p>
          </div>
          <div className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`} 
               title={isOnline ? 'Online' : 'Offline'} />
        </div>

        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar loja..."
            className="input pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            🔍
          </span>
        </div>
      </div>

      {/* Lista de lojas */}
      <div className="p-4 space-y-3">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {search ? 'Nenhuma loja encontrada' : 'Nenhuma loja na sua rota'}
            </p>
          </div>
        ) : (
          filteredStores.map((store) => {
            const completed = isCompleted(store.id);
            const hasCoords = store.latitude !== 0 && store.longitude !== 0;

            return (
              <button
                key={store.id}
                onClick={() => !completed && handleSelectStore(store)}
                disabled={completed}
                className={`card w-full text-left transition-all ${
                  completed 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:border-primary active:scale-[0.99]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    completed ? 'bg-green-500/20' : 'bg-primary/20'
                  }`}>
                    {completed ? '✅' : '🏪'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{store.name}</h3>
                      {store.code && (
                        <span className="badge bg-dark-elevated text-gray-400 text-xs">
                          {store.code}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{store.address}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {completed ? (
                        <span className="badge-success">Visitada</span>
                      ) : (
                        <>
                          {!hasCoords && (
                            <span className="badge-warning">Sem coordenadas</span>
                          )}
                          <span className="badge-info">Pendente</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!completed && (
                    <div className="text-gray-400">
                      →
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
