import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { industryService } from '../services/industryService';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function IndustryCoverage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: coverage, isLoading } = useQuery({
    queryKey: ['industry-coverage', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      industryService.getIndustryCoverage(
        dateRange.startDate,
        dateRange.endDate
      ),
  });

  const totalIndustries = coverage?.coverage?.length || 0;
  const industriesWithPhotos = coverage?.coverage?.filter((i: any) => i.hasCoverage).length || 0;
  const coveragePercentage = totalIndustries > 0 ? (industriesWithPhotos / totalIndustries) * 100 : 0;
  const missingIndustries = coverage?.coverage?.filter((i: any) => !i.hasCoverage) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Carregando cobertura...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Cobertura de Indústrias</h1>
          <p className="text-text-secondary mt-1">
            Acompanhe a cobertura de fotos por indústria (22 indústrias)
          </p>
        </div>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-4 py-2 bg-dark-backgroundSecondary border border-dark-border rounded-lg text-text-primary"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-4 py-2 bg-dark-backgroundSecondary border border-dark-border rounded-lg text-text-primary"
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="text-text-secondary text-sm">Total de Indústrias</div>
            <div className="text-3xl font-bold text-text-primary mt-2">{totalIndustries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-text-secondary text-sm">Com Fotos</div>
            <div className="text-3xl font-bold text-primary-400 mt-2">{industriesWithPhotos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-text-secondary text-sm">Sem Fotos</div>
            <div className="text-3xl font-bold text-error-500 mt-2">{totalIndustries - industriesWithPhotos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-text-secondary text-sm">Cobertura</div>
            <div className="text-3xl font-bold text-text-primary mt-2">
              {Math.round(coveragePercentage)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Cobertura */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Cobertura por Indústria</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {coverage?.coverage?.map((industry: any) => (
              <div
                key={industry.id}
                className="flex items-center justify-between p-4 bg-dark-backgroundSecondary rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold">
                      {industry.photoCount > 0 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">{industry.name}</div>
                    <div className="text-sm text-text-tertiary font-mono">{industry.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-text-primary font-semibold">{industry.photoCount}</div>
                    <div className="text-xs text-text-tertiary">fotos</div>
                  </div>
                  <Badge variant={industry.hasCoverage ? 'primary' : 'error'}>
                    {industry.hasCoverage ? 'Coberto' : 'Sem cobertura'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Indústrias sem Cobertura */}
      {missingIndustries.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-error-500">
              ⚠️ Indústrias sem Cobertura ({missingIndustries.length})
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {missingIndustries.map((industry: any) => (
                <div
                  key={industry.id}
                  className="p-3 bg-error-500/10 border border-error-500/30 rounded-lg"
                >
                  <div className="font-semibold text-text-primary">{industry.name}</div>
                  <div className="text-sm text-text-tertiary font-mono">{industry.code}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

