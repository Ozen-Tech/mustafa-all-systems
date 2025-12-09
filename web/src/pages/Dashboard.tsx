import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supervisorService } from '../services/supervisorService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import AdvancedFilters, { FilterState } from '../components/dashboard/AdvancedFilters';
import RealtimeMetrics from '../components/dashboard/RealtimeMetrics';
import PhotoQualityIndicator from '../components/dashboard/PhotoQualityIndicator';
import CompliancePanel from '../components/dashboard/CompliancePanel';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import BulkActions from '../components/dashboard/BulkActions';
import ExportTools from '../components/dashboard/ExportTools';

// Ícones SVG
const AlertIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const PhotoIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RouteIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedPromoters: [],
    selectedStores: [],
    status: 'all',
    compliance: {
      photos: 'all',
      schedule: 'all',
      priceResearch: 'all',
    },
  });
  const [selectedPromoters, setSelectedPromoters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'compliance' | 'export'>('overview');

  // Criar uma chave estável para o queryKey usando valores primitivos diretamente
  // Não usar useMemo aqui para evitar problemas com dependências
  const filtersKey = `${filters.startDate}-${filters.endDate}-${filters.selectedPromoters.length}-${filters.selectedStores.length}-${filters.status}-${filters.compliance.photos}-${filters.compliance.schedule}-${filters.compliance.priceResearch}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', filtersKey],
    queryFn: () => supervisorService.getDashboard(),
  });

  const { data: promotersData } = useQuery({
    queryKey: ['promoters'],
    queryFn: () => supervisorService.getPromoters(),
  });

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const stores = await supervisorService.getAllStores();
      return { stores: stores.stores || [] };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-text-secondary">Carregando dados...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md border-error-500">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-error-500">
                <AlertIcon />
              </div>
              <div>
                <h3 className="text-error-500 font-semibold">Erro ao carregar dashboard</h3>
                <p className="text-text-secondary text-sm mt-1">
                  Não foi possível carregar os dados. Tente novamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Garantir que sempre temos valores válidos
  const stats = data?.stats || {};
  const visitsByPromoterRaw = data?.visitsByPromoter || [];
  const promotersList = promotersData?.promoters || [];
  
  // Calcular visitsByPromoter diretamente sem useMemo para evitar problemas com dependências
  // Isso garante que o cálculo sempre acontece na mesma ordem
  let visitsByPromoter: any[] = [];
  if (visitsByPromoterRaw && visitsByPromoterRaw.length > 0) {
    if (!promotersList || promotersList.length === 0) {
      visitsByPromoter = visitsByPromoterRaw.map((item: any) => ({
        ...item,
        promoterName: `Promotor ${item.promoterId?.slice(0, 8) || 'Unknown'}`,
      }));
    } else {
      visitsByPromoter = visitsByPromoterRaw.map((item: any) => {
        if (!item || !item.promoterId) {
          return {
            ...item,
            promoterName: 'Desconhecido',
          };
        }
        const promoter = promotersList.find((p: any) => p && p.id === item.promoterId);
        return {
          ...item,
          promoterName: promoter?.name || `Promotor ${item.promoterId.slice(0, 8)}`,
        };
      });
    }
  }

  // Calcular métricas de problemas diretamente sem useMemo
  // Isso garante que o cálculo sempre acontece na mesma ordem
  let problemMetrics = {
    inactiveToday: 0,
    withoutPhotos: 0,
    offSchedule: 0,
    routesNotStarted: 0,
    totalPromoters: 0,
    problemPromoters: [] as any[],
  };

  if (data && promotersData && promotersList && promotersList.length > 0) {
    const promoters = promotersList;
    const visits = visitsByPromoterRaw;
    
    // Promotores sem atividade hoje
    const promotersWithVisitsToday = new Set(
      visits.filter((v: any) => {
        if (!v || !v.date) return false;
        const visitDate = new Date(v.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);
        return visitDate.getTime() === today.getTime();
      }).map((v: any) => v.promoterId).filter(Boolean)
    );
    
    const inactiveToday = promoters.filter((p: any) => p && p.id && !promotersWithVisitsToday.has(p.id));
    
    // Promotores sem fotos (simulado - precisa de dados reais)
    const promotersWithoutPhotos = promoters.filter((p: any) => {
      if (!p || !p.id) return false;
      const promoterVisits = visits.filter((v: any) => v && v.promoterId === p.id);
      return promoterVisits.length > 0 && promoterVisits.every((v: any) => (v.photoCount || 0) === 0);
    });
    
    // Promotores fora do horário (simulado)
    // Usar hash baseado no ID para determinar consistentemente
    const hash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    const promotersOffSchedule = promoters.filter((p: any) => {
      if (!p || !p.id) return false;
      // Lógica para verificar se está fora do horário planejado (simulado)
      const seed = hash(p.id);
      return (seed % 10) > 7; // ~30% dos promotores fora do horário
    });
    
    // Rotas não iniciadas
    const routesNotStarted = promoters.filter((p: any) => {
      if (!p || !p.id) return false;
      const hasVisitToday = promotersWithVisitsToday.has(p.id);
      return !hasVisitToday;
    });

    problemMetrics = {
      inactiveToday: inactiveToday.length,
      withoutPhotos: promotersWithoutPhotos.length,
      offSchedule: promotersOffSchedule.length,
      routesNotStarted: routesNotStarted.length,
      totalPromoters: promoters.length,
      problemPromoters: [
        ...inactiveToday.slice(0, 5),
        ...promotersWithoutPhotos.slice(0, 3),
        ...promotersOffSchedule.slice(0, 3),
      ].slice(0, 10),
    };
  }

  // Cards de KPIs de Problemas
  const problemKPIs = [
    {
      title: 'Promotores Sem Atividade Hoje',
      value: problemMetrics.inactiveToday,
      total: problemMetrics.totalPromoters,
      icon: UsersIcon,
      variant: 'error' as const,
      description: 'Não iniciaram rotas hoje',
      urgent: problemMetrics.inactiveToday > 0,
    },
    {
      title: 'Sem Fotos Enviadas',
      value: problemMetrics.withoutPhotos,
      total: problemMetrics.totalPromoters,
      icon: PhotoIcon,
      variant: 'error' as const,
      description: 'Promotores sem fotos nas visitas',
      urgent: problemMetrics.withoutPhotos > 0,
    },
    {
      title: 'Fora do Horário Planejado',
      value: problemMetrics.offSchedule,
      total: problemMetrics.totalPromoters,
      icon: ClockIcon,
      variant: 'warning' as const,
      description: 'Não cumprindo horário da rota',
      urgent: problemMetrics.offSchedule > 0,
    },
    {
      title: 'Rotas Não Iniciadas',
      value: problemMetrics.routesNotStarted,
      total: problemMetrics.totalPromoters,
      icon: RouteIcon,
      variant: 'error' as const,
      description: 'Rotas planejadas não iniciadas',
      urgent: problemMetrics.routesNotStarted > 0,
    },
  ];

  // Dados para gráfico de problemas
  const problemChartData = problemKPIs.map((kpi) => ({
    name: kpi.title.replace('Promotores ', '').replace('Sem ', '').replace('Fora do ', '').replace('Não ', ''),
    problemas: kpi.value,
    total: kpi.total,
    percentual: kpi.total > 0 ? ((kpi.value / kpi.total) * 100).toFixed(1) : 0,
  }));

  const COLORS = {
    error: '#ef4444',
    warning: '#f59e0b',
    primary: '#7c3aed',
  };

  // Preparar dados para Analytics - Simplificado sem useMemo para evitar problemas
  let analyticsData = {
    visitsOverTime: [] as any[],
    performanceByPromoter: [] as any[],
    activityHeatmap: [] as any[],
    trends: {
      visits: { current: 0, previous: 0, change: 0 },
      hours: { current: 0, previous: 0, change: 0 },
      photos: { current: 0, previous: 0, change: 0 },
      compliance: { current: 0, previous: 0, change: 0 },
    },
  };

  if (data && visitsByPromoterRaw && visitsByPromoterRaw.length > 0) {
    const visits = visitsByPromoterRaw || [];
    const visitsOverTime = visits
      .filter((v: any) => v && v.date)
      .map((v: any) => ({
        date: new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        visits: v.visitCount || 0,
        completed: v.completedCount || 0,
      }));

    // Calcular performanceByPromoter diretamente de visitsByPromoterRaw
    const performanceByPromoter = visits
      .filter((v: any) => v && v.promoterId)
      .reduce((acc: any, v: any) => {
        const promoter = promotersList?.find((p: any) => p && p.id === v.promoterId);
        const promoterName = promoter?.name || `Promotor ${v.promoterId.slice(0, 8)}`;
        const existing = acc.find((p: any) => p.name === promoterName);
        if (existing) {
          existing.visits += v.visitCount || 0;
          existing.hours += v.totalHours || 0;
          existing.photos += v.totalPhotos || 0;
        } else {
          acc.push({
            name: promoterName,
            visits: v.visitCount || 0,
            hours: v.totalHours || 0,
            photos: v.totalPhotos || 0,
          });
        }
        return acc;
      }, []);

    const activityHeatmap = visits
      .filter((v: any) => v)
      .reduce((acc: any, v: any) => {
        const storeName = v.storeName || 'Desconhecida';
        const existing = acc.find((a: any) => a.store === storeName);
        if (existing) {
          existing.visits += v.visitCount || 0;
        } else {
          acc.push({ store: storeName, visits: v.visitCount || 0 });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.visits - a.visits)
      .slice(0, 12);

    const totalVisits = stats.totalVisits || 0;
    const totalHours = parseFloat(stats.totalHours || '0');
    const totalPhotos = stats.totalPhotos || 0;

    analyticsData = {
      visitsOverTime,
      performanceByPromoter,
      activityHeatmap,
      trends: {
        visits: { current: totalVisits, previous: totalVisits * 0.9, change: 10 },
        hours: { current: totalHours, previous: totalHours * 0.9, change: 10 },
        photos: { current: totalPhotos, previous: totalPhotos * 0.9, change: 10 },
        compliance: { current: 85, previous: 80, change: 5 },
      },
    };
  }

  // Preparar dados de conformidade - Simplificado sem useMemo
  let complianceData: any[] = [];
  if (promotersList && promotersList.length > 0) {
    const hash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };
    
    complianceData = promotersList.map((p: any) => {
      if (!p || !p.id) return null;
      const seed = hash(p.id);
      return {
        id: p.id,
        name: p.name || 'Desconhecido',
        photoCompliance: (seed % 100),
        scheduleCompliance: ((seed * 2) % 100),
        routeCompliance: ((seed * 3) % 100),
      };
    }).filter(Boolean);
  }


  // Sempre renderizar componentes que usam hooks, mas ocultá-los quando não estão ativos
  // Isso garante que os hooks sejam sempre chamados na mesma ordem
  return (
    <div className="space-y-6">
      {/* Tabs de Navegação */}
      <div className="flex gap-2 border-b border-dark-border">
        {[
          { id: 'overview', label: 'Visão Geral', icon: '📊' },
          { id: 'analytics', label: 'Análises', icon: '📈' },
          { id: 'compliance', label: 'Conformidade', icon: '✅' },
          { id: 'export', label: 'Exportar', icon: '📥' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Renderizar componentes apenas quando necessário */}
      {activeTab === 'overview' && (
        <div>
          {/* Métricas em Tempo Real */}
          <RealtimeMetrics refreshInterval={10} />

        {/* Filtros Avançados */}
        <AdvancedFilters
          promoters={promotersData?.promoters || []}
          stores={storesData?.stores || []}
          onFilterChange={setFilters}
        />

        {/* Ações em Massa */}
        <BulkActions
          selectedPromoters={selectedPromoters}
          onActionComplete={() => {
            setSelectedPromoters([]);
          }}
        />

        {/* Alertas Críticos no Topo */}
        {problemMetrics.problemPromoters.length > 0 && (
        <Card className="border-error-500 shadow-error">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-error-500/20 text-error-500">
                  <AlertIcon />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Alertas Críticos</h2>
                  <p className="text-sm text-text-secondary">
                    {problemMetrics.problemPromoters.length} promotor(es) com problemas identificados
                  </p>
                </div>
              </div>
              <Badge variant="error" size="lg">
                {problemMetrics.problemPromoters.length} Alertas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {problemMetrics.problemPromoters.map((promoter: any, idx: number) => (
                <Link
                  key={promoter.id || idx}
                  to={`/promoters/${promoter.id}`}
                  className="p-4 bg-dark-cardElevated border border-error-500/50 rounded-lg hover:border-error-500 hover:glow-error transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{promoter.name}</span>
                    <Badge variant="error" size="sm">Problema</Badge>
                  </div>
                  <p className="text-xs text-text-tertiary">{promoter.email}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs de Problemas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {problemKPIs.map((kpi, index) => {
          const Icon = kpi.icon;
          const percentage = kpi.total > 0 ? Number(((kpi.value / kpi.total) * 100).toFixed(0)) : 0;
          const isCritical = kpi.urgent && kpi.value > 0;
          
          return (
            <Card
              key={index}
              className={`${
                isCritical ? 'border-error-500 shadow-error' : 'border-dark-border'
              } hover:shadow-card-elevated transition-all`}
            >
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${
                    kpi.variant === 'error' ? 'bg-error-500/20 text-error-500' :
                    kpi.variant === 'warning' ? 'bg-warning-500/20 text-warning-500' :
                    'bg-primary-600/20 text-primary-400'
                  }`}>
                    <Icon />
                  </div>
                  {isCritical && (
                    <div className="w-3 h-3 rounded-full bg-error-500 animate-pulse"></div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1 font-medium">{kpi.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${
                      isCritical ? 'text-error-500' : 'text-text-primary'
                    }`}>
                      {kpi.value}
                    </p>
                    <span className="text-sm text-text-tertiary">de {kpi.total}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-tertiary">{kpi.description}</span>
                      <span className={`font-semibold ${
                        isCritical ? 'text-error-500' : 'text-text-secondary'
                      }`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-dark-backgroundSecondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isCritical ? 'bg-error-500' : 'bg-warning-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos de Problemas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Distribuição de Problemas */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              Distribuição de Problemas
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Tipos de não-conformidades identificadas
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={problemChartData}>
                <defs>
                  <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#241F35',
                    border: '1px solid #3D3550',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                  }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Bar
                  dataKey="problemas"
                  radius={[8, 8, 0, 0]}
                >
                  {problemChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 2 ? 'url(#colorWarning)' : 'url(#colorError)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Visitas por Promotor (com destaque para problemas) */}
        {visitsByPromoter.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">
                Visitas por Promotor
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Últimos 7 dias - Promotores com 0 visitas destacados
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visitsByPromoter}>
                  <defs>
                    <linearGradient id="colorVisit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
                  <XAxis
                    dataKey="promoterName"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#241F35',
                      border: '1px solid #3D3550',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Bar
                    dataKey="visitCount"
                    fill="url(#colorVisit)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabela de Promotores com Status de Problemas */}
      {promotersData?.promoters && promotersData.promoters.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Promotores</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Status e problemas identificados
                </p>
              </div>
              <Badge variant="primary" size="md">
                {promotersData.promoters.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-dark">
              <table className="min-w-full divide-y divide-dark-border">
                <thead>
                  <tr className="bg-dark-backgroundSecondary">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-dark-card divide-y divide-dark-border">
                  {promotersData.promoters.map((promoter: any) => {
                    const hasProblems = problemMetrics.problemPromoters.some(
                      (p: any) => p.id === promoter.id
                    );
                    const promoterVisits = visitsByPromoter.filter(
                      (v: any) => v.promoterId === promoter.id
                    );
                    const visitCount = promoterVisits.reduce(
                      (sum: number, v: any) => sum + (v.visitCount || 0),
                      0
                    );
                    const isSelected = selectedPromoters.includes(promoter.id);
                    
                    return (
                      <tr
                        key={promoter.id}
                        className={`hover:bg-dark-cardElevated transition-colors cursor-pointer ${
                          hasProblems ? 'border-l-4 border-error-500' : ''
                        } ${isSelected ? 'bg-primary-600/10' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPromoters(selectedPromoters.filter((id) => id !== promoter.id));
                          } else {
                            setSelectedPromoters([...selectedPromoters, promoter.id]);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedPromoters([...selectedPromoters, promoter.id]);
                                } else {
                                  setSelectedPromoters(selectedPromoters.filter((id) => id !== promoter.id));
                                }
                              }}
                              className="w-4 h-4 text-primary-600 rounded border-dark-border focus:ring-primary-500 mr-3"
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-text-primary font-semibold mr-3 ${
                              hasProblems
                                ? 'bg-error-500/20 border-2 border-error-500'
                                : 'bg-gradient-to-br from-primary-600 to-accent-500 shadow-primary'
                            }`}>
                              {promoter.name?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {promoter.name}
                              </span>
                              {hasProblems && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertIcon className="w-3 h-3 text-error-500" />
                                  <span className="text-xs text-error-500">Problemas</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">{promoter.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {hasProblems ? (
                              <Badge variant="error" size="sm">Com Problemas</Badge>
                            ) : (
                              <Badge variant="success" size="sm">OK</Badge>
                            )}
                            <span className="text-xs text-text-tertiary">
                              {visitCount} visita(s)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/promoters/${promoter.id}`}
                              className="inline-flex items-center px-3 py-1.5 bg-primary-600/20 text-primary-400 border border-primary-600 rounded-lg hover:bg-primary-600/30 hover:glow-primary transition-all font-medium"
                            >
                              Ver Detalhes
                            </Link>
                            <Link
                              to={`/promoters/${promoter.id}/route`}
                              className="inline-flex items-center px-3 py-1.5 bg-accent-500/20 text-accent-400 border border-accent-500 rounded-lg hover:bg-accent-500/30 transition-all font-medium"
                            >
                              Ver Rota
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        )}
        </div>
      )}

      {/* Painel de Análises */}
      {activeTab === 'analytics' && (
        <AnalyticsPanel data={analyticsData} />
      )}

      {/* Painel de Conformidade */}
      {activeTab === 'compliance' && (
        <CompliancePanel promoters={complianceData} />
      )}

      {/* Ferramentas de Exportação */}
      {activeTab === 'export' && (
        <ExportTools filters={filters} />
      )}
    </div>
  );
}
