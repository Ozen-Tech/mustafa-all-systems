import React from 'react';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CompliancePanelProps {
  promoters: Array<{
    id: string;
    name: string;
    photoCompliance: number;
    scheduleCompliance: number;
    routeCompliance: number;
  }>;
}

export default function CompliancePanel({ promoters }: CompliancePanelProps) {
  const complianceData = promoters.map((p) => ({
    name: p.name,
    fotos: p.photoCompliance,
    horario: p.scheduleCompliance,
    rota: p.routeCompliance,
    geral: (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3,
  }));

  const overallCompliance = promoters.length > 0
    ? promoters.reduce((sum, p) => sum + (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3, 0) / promoters.length
    : 0;

  const complianceStatus = {
    excellent: promoters.filter((p) => {
      const avg = (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3;
      return avg >= 90;
    }).length,
    good: promoters.filter((p) => {
      const avg = (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3;
      return avg >= 70 && avg < 90;
    }).length,
    attention: promoters.filter((p) => {
      const avg = (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3;
      return avg >= 50 && avg < 70;
    }).length,
    critical: promoters.filter((p) => {
      const avg = (p.photoCompliance + p.scheduleCompliance + p.routeCompliance) / 3;
      return avg < 50;
    }).length,
  };

  const pieData = [
    { name: 'Excelente (≥90%)', value: complianceStatus.excellent, color: '#22c55e' },
    { name: 'Bom (70-89%)', value: complianceStatus.good, color: '#7c3aed' },
    { name: 'Atenção (50-69%)', value: complianceStatus.attention, color: '#f59e0b' },
    { name: 'Crítico (<50%)', value: complianceStatus.critical, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Conformidade Geral</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-dark-cardElevated rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Conformidade Média</p>
              <p className="text-3xl font-bold text-text-primary">{overallCompliance.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-success-500/10 border border-success-500/50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Excelente</p>
              <p className="text-3xl font-bold text-success-500">{complianceStatus.excellent}</p>
            </div>
            <div className="text-center p-4 bg-warning-500/10 border border-warning-500/50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Atenção</p>
              <p className="text-3xl font-bold text-warning-500">{complianceStatus.attention}</p>
            </div>
            <div className="text-center p-4 bg-error-500/10 border border-error-500/50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Crítico</p>
              <p className="text-3xl font-bold text-error-500">{complianceStatus.critical}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Conformidade */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Distribuição de Conformidade</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

        {/* Conformidade por Tipo */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Conformidade por Tipo</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={complianceData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D3550" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#241F35',
                    border: '1px solid #3D3550',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                  }}
                />
                <Legend />
                <Bar dataKey="fotos" fill="#7c3aed" name="Fotos" />
                <Bar dataKey="horario" fill="#f59e0b" name="Horário" />
                <Bar dataKey="rota" fill="#22c55e" name="Rota" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Conformidade */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Detalhes por Promotor</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-border">
              <thead>
                <tr className="bg-dark-backgroundSecondary">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Promotor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Fotos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Horário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Rota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                    Geral
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {promoters.map((promoter) => {
                  const avg = (promoter.photoCompliance + promoter.scheduleCompliance + promoter.routeCompliance) / 3;
                  const status = avg >= 90 ? 'success' : avg >= 70 ? 'primary' : avg >= 50 ? 'warning' : 'error';
                  
                  return (
                    <tr key={promoter.id} className="hover:bg-dark-cardElevated">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {promoter.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={promoter.photoCompliance >= 80 ? 'success' : promoter.photoCompliance >= 50 ? 'warning' : 'error'}
                          size="sm"
                        >
                          {promoter.photoCompliance.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={promoter.scheduleCompliance >= 80 ? 'success' : promoter.scheduleCompliance >= 50 ? 'warning' : 'error'}
                          size="sm"
                        >
                          {promoter.scheduleCompliance.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={promoter.routeCompliance >= 80 ? 'success' : promoter.routeCompliance >= 50 ? 'warning' : 'error'}
                          size="sm"
                        >
                          {promoter.routeCompliance.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={status} size="md">
                          {avg.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

