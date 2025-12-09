import React, { useState } from 'react';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { format } from 'date-fns';
import { supervisorService } from '../../services/supervisorService';

interface ExportToolsProps {
  filters?: {
    startDate: string;
    endDate: string;
    selectedPromoters?: string[];
    selectedStores?: string[];
  };
}

export default function ExportTools({ filters }: ExportToolsProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [exporting, setExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<any>(null);
  const [reportType, setReportType] = useState<'performance' | 'compliance' | 'executive' | 'custom'>('performance');

  const handleExport = async () => {
    if (!filters) return;

    setExporting(true);
    try {
      const response = await supervisorService.exportReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        promoterIds: filters.selectedPromoters,
        storeIds: filters.selectedStores,
        format: exportFormat === 'csv' ? 'excel' : exportFormat,
      });

      if (response.jobId) {
        setExportJobId(response.jobId);
        // Polling do status
        const interval = setInterval(async () => {
          try {
            const status = await supervisorService.getExportStatus(response.jobId);
            setExportStatus(status);
            if (status.status === 'completed' || status.status === 'failed') {
              clearInterval(interval);
              setExporting(false);
              if (status.status === 'completed') {
                // Download automático
                const blob = await supervisorService.downloadExport(response.jobId);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'csv' ? 'csv' : exportFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }
            }
          } catch (error) {
            console.error('Erro ao verificar status:', error);
            clearInterval(interval);
            setExporting(false);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setExporting(false);
    }
  };

  const reportTypes = [
    {
      id: 'performance' as const,
      name: 'Performance por Promotor',
      description: 'Visitas, horas, fotos e conformidade por promotor',
      icon: '📊',
    },
    {
      id: 'compliance' as const,
      name: 'Conformidade de Horários',
      description: 'Análise de cumprimento de horários planejados',
      icon: '⏰',
    },
    {
      id: 'executive' as const,
      name: 'Resumo Executivo',
      description: 'Métricas principais para apresentação',
      icon: '📈',
    },
    {
      id: 'custom' as const,
      name: 'Personalizado',
      description: 'Selecione campos específicos',
      icon: '⚙️',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-text-primary">Exportar Relatórios</h3>
        <p className="text-sm text-text-secondary mt-1">
          Gere relatórios profissionais para reuniões e análises
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tipo de Relatório
            </label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === type.id
                      ? 'border-primary-600 bg-primary-600/10'
                      : 'border-dark-border hover:border-primary-600/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary">{type.name}</p>
                      <p className="text-xs text-text-tertiary mt-1">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Formato de Exportação
            </label>
            <div className="flex gap-3">
              {(['excel', 'pdf', 'csv'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    exportFormat === format
                      ? 'border-primary-600 bg-primary-600/10 text-primary-400'
                      : 'border-dark-border hover:border-primary-600/50 text-text-secondary'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Informações do Período */}
          {filters && (
            <div className="p-4 bg-dark-cardElevated rounded-lg border border-dark-border">
              <p className="text-sm font-medium text-text-secondary mb-2">Período Selecionado</p>
              <div className="flex items-center gap-4 text-sm text-text-primary">
                <span>
                  {format(new Date(filters.startDate), 'dd/MM/yyyy')} -{' '}
                  {format(new Date(filters.endDate), 'dd/MM/yyyy')}
                </span>
                {filters.selectedPromoters && filters.selectedPromoters.length > 0 && (
                  <Badge variant="primary" size="sm">
                    {filters.selectedPromoters.length} promotor(es)
                  </Badge>
                )}
                {filters.selectedStores && filters.selectedStores.length > 0 && (
                  <Badge variant="accent" size="sm">
                    {filters.selectedStores.length} loja(s)
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Status de Exportação */}
          {exportStatus && (
            <div className="p-4 bg-dark-cardElevated rounded-lg border border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Status da Exportação</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {exportStatus.status === 'processing' && 'Processando...'}
                    {exportStatus.status === 'completed' && 'Concluído!'}
                    {exportStatus.status === 'failed' && 'Falhou'}
                  </p>
                </div>
                {exportStatus.progress && (
                  <div className="w-32">
                    <div className="w-full bg-dark-backgroundSecondary rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${exportStatus.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão de Exportar */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleExport}
            isLoading={exporting}
            disabled={!filters || exporting}
            className="w-full"
          >
            {exporting ? 'Exportando...' : `Exportar como ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

