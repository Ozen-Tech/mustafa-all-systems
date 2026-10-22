import { useEffect, useState } from 'react';
import { api, Mission } from '../services/api';
import SyncStatusBar from '../components/SyncStatusBar';

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    setIsLoading(true);
    try {
      const response = await api.getMissions();
      setMissions(response.missions);
      setCompletedIds(new Set(response.missions.filter(m => m.completed).map(m => m.id)));
    } catch (error) {
      console.error('Erro ao carregar missões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMission = async (mission: Mission) => {
    const newCompleted = !completedIds.has(mission.id);
    
    // Otimistic update
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (newCompleted) {
        next.add(mission.id);
      } else {
        next.delete(mission.id);
      }
      return next;
    });

    try {
      await api.completeMission({
        missionId: mission.id,
        done: newCompleted
      });
    } catch (error) {
      // Reverte em caso de erro
      setCompletedIds(prev => {
        const next = new Set(prev);
        if (newCompleted) {
          next.delete(mission.id);
        } else {
          next.add(mission.id);
        }
        return next;
      });
      console.error('Erro ao atualizar missão:', error);
    }
  };

  const pendingMissions = missions.filter(m => !completedIds.has(m.id));
  const doneMissions = missions.filter(m => completedIds.has(m.id));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Carregando missões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <SyncStatusBar />

      {/* Header */}
      <div className="sticky top-0 bg-dark-bg z-10 p-4 border-b border-dark-border">
        <h1 className="text-xl font-bold">Missões da Semana</h1>
        <p className="text-sm text-gray-400">
          {doneMissions.length}/{missions.length} concluídas
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Progresso */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progresso</span>
            <span className="text-sm font-medium">
              {Math.round((doneMissions.length / missions.length) * 100) || 0}%
            </span>
          </div>
          <div className="w-full h-3 bg-dark-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(doneMissions.length / missions.length) * 100 || 0}%` }}
            />
          </div>
        </div>

        {/* Missões pendentes */}
        {pendingMissions.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              🎯 Pendentes ({pendingMissions.length})
            </h2>
            <div className="space-y-3">
              {pendingMissions.map(mission => (
                <MissionCard 
                  key={mission.id}
                  mission={mission}
                  isCompleted={false}
                  onToggle={() => handleToggleMission(mission)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Missões concluídas */}
        {doneMissions.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              ✅ Concluídas ({doneMissions.length})
            </h2>
            <div className="space-y-3 opacity-70">
              {doneMissions.map(mission => (
                <MissionCard 
                  key={mission.id}
                  mission={mission}
                  isCompleted={true}
                  onToggle={() => handleToggleMission(mission)}
                />
              ))}
            </div>
          </div>
        )}

        {missions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-gray-400">Nenhuma missão esta semana</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MissionCardProps {
  mission: Mission;
  isCompleted: boolean;
  onToggle: () => void;
}

function MissionCard({ mission, isCompleted, onToggle }: MissionCardProps) {
  return (
    <div className={`card ${isCompleted ? 'border-green-500/40' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            isCompleted 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-500 hover:border-primary'
          }`}
        >
          {isCompleted && '✓'}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {mission.title}
          </p>
          {mission.description && (
            <p className="text-sm text-gray-400 mt-1">{mission.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {mission.industryName && (
              <span className="badge bg-primary/20 text-primary-300">
                {mission.industryName}
              </span>
            )}
            {mission.requiresPhoto && (
              <span className="badge bg-accent/20 text-accent">
                📷 Foto
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
