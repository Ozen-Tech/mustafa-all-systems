import { useAuthStore } from '../stores/authStore';
import { useVisitStore } from '../stores/visitStore';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { pendingSync, isOnline, triggerSync } = useVisitStore();

  const handleLogout = () => {
    if (pendingSync.total > 0) {
      if (!confirm(`Você tem ${pendingSync.total} item(s) pendentes de sincronização. Sair mesmo assim?`)) {
        return;
      }
    }
    logout();
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary p-6 pb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            👤
          </div>
          <div>
            <h1 className="text-xl font-bold">{user?.name || 'Usuário'}</h1>
            <p className="text-primary-200">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-6 space-y-4">
        {/* Status de sincronização */}
        <div className="card">
          <h2 className="font-medium mb-4">Status de Sincronização</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`status-indicator ${isOnline ? 'status-online' : 'status-offline'}`} />
                <span className="text-gray-300">Conexão</span>
              </div>
              <span className={isOnline ? 'text-green-400' : 'text-yellow-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Check-ins pendentes</span>
              <span className={pendingSync.checkIns > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {pendingSync.checkIns}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Fotos pendentes</span>
              <span className={pendingSync.photos > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {pendingSync.photos}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Tarefas pendentes</span>
              <span className={pendingSync.tasks > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {pendingSync.tasks}
              </span>
            </div>
          </div>

          {pendingSync.total > 0 && isOnline && (
            <button 
              onClick={triggerSync}
              className="btn-primary w-full mt-4"
            >
              🔄 Sincronizar Agora
            </button>
          )}
        </div>

        {/* Info do app */}
        <div className="card">
          <h2 className="font-medium mb-4">Sobre o App</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Promotor Mustafá v2.0</p>
            <p>Offline-first com IndexedDB</p>
            <p className="text-xs">
              Dados salvos localmente nunca são perdidos, mesmo sem internet.
            </p>
          </div>
        </div>

        {/* Botão de logout */}
        <button 
          onClick={handleLogout}
          className="btn-outline w-full text-red-400 border-red-400/50 hover:bg-red-400/10"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
