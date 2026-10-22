import { useEffect } from 'react';
import { useVisitStore } from '../stores/visitStore';

export default function SyncStatusBar() {
  const { pendingSync, isOnline, refreshPendingCount, triggerSync } = useVisitStore();

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  if (pendingSync.total === 0 && isOnline) {
    return null;
  }

  return (
    <div className={`px-4 py-2 flex items-center justify-between text-sm ${
      isOnline ? 'bg-yellow-500/20' : 'bg-red-500/20'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`status-indicator ${isOnline ? 'status-offline' : 'status-error'}`} />
        <span>
          {!isOnline ? (
            'Você está offline'
          ) : pendingSync.total > 0 ? (
            `${pendingSync.total} item(s) pendentes de sincronização`
          ) : (
            'Tudo sincronizado'
          )}
        </span>
      </div>
      
      {isOnline && pendingSync.total > 0 && (
        <button 
          onClick={triggerSync}
          className="text-accent font-medium"
        >
          Sincronizar
        </button>
      )}
    </div>
  );
}
