import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { supervisorService } from '../../services/supervisorService';

interface RealtimeMetricsProps {
  refreshInterval?: number; // em segundos
}

export default function RealtimeMetrics({ refreshInterval = 10 }: RealtimeMetricsProps) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);

  const { data: realtimeData, refetch } = useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: async () => {
      // Simular dados em tempo real - em produção, isso viria de um endpoint WebSocket ou polling
      const dashboard = await supervisorService.getDashboard();
      const promoters = await supervisorService.getPromoters();
      
      // Calcular métricas em tempo real
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const activePromoters = promoters.promoters?.filter((p: any) => {
        // Verificar se tem visita ativa hoje
        return true; // Placeholder - precisa de lógica real
      }) || [];

      const recentVisits = dashboard.visitsByPromoter?.filter((v: any) => {
        const visitDate = new Date(v.date || Date.now());
        return visitDate >= today;
      }) || [];

      return {
        activePromoters: activePromoters.length,
        totalPromoters: promoters.promoters?.length || 0,
        visitsToday: recentVisits.length,
        visitsLastHour: recentVisits.filter((v: any) => {
          const visitDate = new Date(v.date || Date.now());
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          return visitDate >= oneHourAgo;
        }).length,
        alerts: [] as Array<{ type: string; message: string }>,
      };
    },
    refetchInterval: refreshInterval * 1000,
  });

  // Detectar novos alertas
  useEffect(() => {
    if (realtimeData?.alerts) {
      realtimeData.alerts.forEach((alert: any) => {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.message === alert.message);
          if (!exists) {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                type: alert.type || 'info',
                message: alert.message,
                timestamp: new Date(),
              },
            ];
          }
          return prev;
        });
      });
    }
  }, [realtimeData]);

  // Remover notificações antigas (mais de 1 minuto)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.filter(
          (n) => new Date().getTime() - n.timestamp.getTime() < 60000
        )
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      label: 'Promotores Ativos Agora',
      value: realtimeData?.activePromoters || 0,
      total: realtimeData?.totalPromoters || 0,
      icon: '👥',
      color: 'primary',
    },
    {
      label: 'Visitas Hoje',
      value: realtimeData?.visitsToday || 0,
      icon: '📍',
      color: 'accent',
    },
    {
      label: 'Última Hora',
      value: realtimeData?.visitsLastHour || 0,
      icon: '⏰',
      color: 'info',
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Métricas em Tempo Real</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-text-tertiary">Ao vivo</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                className="p-4 bg-dark-cardElevated rounded-lg border border-dark-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{metric.icon}</span>
                  {metric.total && (
                    <Badge variant="primary" size="sm">
                      {metric.total}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-text-secondary mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-text-primary">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      {notifications.length > 0 && (
        <Card className="border-warning-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Alertas Recentes</h3>
              <Badge variant="warning" size="sm">
                {notifications.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.type === 'error'
                      ? 'bg-error-500/10 border-error-500/50'
                      : notification.type === 'warning'
                      ? 'bg-warning-500/10 border-warning-500/50'
                      : 'bg-info-500/10 border-info-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-text-primary">{notification.message}</p>
                    <button
                      onClick={() =>
                        setNotifications((prev) =>
                          prev.filter((n) => n.id !== notification.id)
                        )
                      }
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

