import React from 'react';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsPanelProps {
  data: {
    visitsOverTime: Array<{ date: string; visits: number; completed: number }>;
    performanceByPromoter: Array<{ name: string; visits: number; hours: number; photos: number }>;
    activityHeatmap: Array<{ store: string; visits: number }>;
    trends: {
      visits: { current: number; previous: number; change: number };
      hours: { current: number; previous: number; change: number };
      photos: { current: number; previous: number; change: number };
      compliance: { current: number; previous: number; change: number };
    };
  };
}

export default function AnalyticsPanel({ data }: AnalyticsPanelProps) {
  const COLORS = ['#7c3aed', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Tendências e Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.trends).map(([key, trend]) => {
          const isPositive = trend.change >= 0;
          const labels: Record<string, string> = {
            visits: 'Visitas',
            hours: 'Horas',
            photos: 'Fotos',
            compliance: 'Conformidade',
          };

          return (
            <Card key={key} hover>
              <CardContent>
                <p className="text-sm text-text-secondary mb-2">{labels[key]}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-text-primary">{trend.current}</p>
                  <Badge
                    variant={isPositive ? 'success' : 'error'}
                    size="sm"
                  >
                    {isPositive ? '+' : ''}{trend.change.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  vs período anterior: {trend.previous}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráfico de Visitas ao Longo do Tempo */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Visitas ao Longo do Tempo
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Evolução de visitas e conclusões
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.visitsOverTime}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#241F35',
                  border: '1px solid #3D3550',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="#7c3aed"
                fillOpacity={1}
                fill="url(#colorVisits)"
                name="Total de Visitas"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="Visitas Concluídas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance por Promotor */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Performance por Promotor
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Comparativo de métricas principais
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performanceByPromoter}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                fontSize={12}
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
              />
              <Legend />
              <Bar dataKey="visits" fill="#7c3aed" name="Visitas" />
              <Bar dataKey="hours" fill="#f59e0b" name="Horas" />
              <Bar dataKey="photos" fill="#22c55e" name="Fotos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heatmap de Atividade por Loja */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            Heatmap de Atividade por Loja
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Intensidade de visitas por loja
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.activityHeatmap.map((item, idx) => {
              const intensity = item.visits > 10 ? 'high' : item.visits > 5 ? 'medium' : 'low';
              const colors = {
                high: 'bg-success-500',
                medium: 'bg-warning-500',
                low: 'bg-error-500',
              };

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${colors[intensity]} text-white text-center`}
                >
                  <p className="text-xs font-medium mb-1 truncate">{item.store}</p>
                  <p className="text-lg font-bold">{item.visits}</p>
                  <p className="text-xs opacity-80">visitas</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Tendência de Visitas
            </h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.visitsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#241F35',
                    border: '1px solid #3D3550',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 4 }}
                  name="Visitas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Distribuição de Performance
            </h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.performanceByPromoter.map((p) => ({
                    name: p.name,
                    value: p.visits,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.performanceByPromoter.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#241F35',
                    border: '1px solid #3D3550',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

