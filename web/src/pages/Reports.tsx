import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supervisorService } from '../services/supervisorService';
import { format } from 'date-fns';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { generatePhotoBooking } from '../utils/photoBooking';
import { toast } from '../components/ui/Toaster';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [exportFormat, setExportFormat] = useState<'pptx' | 'pdf' | 'excel' | 'html'>('pptx');
  const [exporting, setExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<any>(null);
  
  // Estados para booking de fotos
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>('');
  const [generatingBooking, setGeneratingBooking] = useState(false);

  const { data: missingPhotos, isLoading } = useQuery({
    queryKey: ['missing-photos', dateRange],
    queryFn: () =>
      supervisorService.getMissingPhotos(undefined, dateRange.startDate, dateRange.endDate),
  });

  const { data: promotersData } = useQuery({
    queryKey: ['promoters'],
    queryFn: () => supervisorService.getPromoters(),
  });

  const { data: promoterVisits, isLoading: loadingVisits } = useQuery({
    queryKey: ['promoter-visits-booking', selectedPromoterId, dateRange],
    queryFn: () => {
      if (!selectedPromoterId) return Promise.resolve({ visits: [] });
      return supervisorService.getPromoterVisits(selectedPromoterId, 1, 1000);
    },
    enabled: !!selectedPromoterId,
  });

  // Polling do status de exportação
  useEffect(() => {
    if (!exportJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await supervisorService.getExportStatus(exportJobId);
        setExportStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setExporting(false);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportJobId]);

  async function handleExport() {
    setExporting(true);
    setExportStatus(null);
    try {
      const result = await supervisorService.exportReport({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: exportFormat,
      });

      setExportJobId(result.jobId);
      setExportStatus(result);
    } catch (error: any) {
      toast.error('Erro ao exportar relatório: ' + (error.response?.data?.message || error.message));
      setExporting(false);
    }
  }

  async function handleDownload() {
    if (!exportJobId) return;

    try {
      const blob = await supervisorService.downloadExport(exportJobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${dateRange.startDate}-${dateRange.endDate}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast.error('Erro ao baixar relatório: ' + (error.response?.data?.message || error.message));
    }
  }

  async function handleGenerateBooking() {
    if (!selectedPromoterId) {
      toast.info('Selecione um promotor para gerar o booking');
      return;
    }

    const promoter = promotersData?.promoters?.find((p: any) => p.id === selectedPromoterId);
    if (!promoter) {
      toast.error('Promotor não encontrado');
      return;
    }

    if (!promoterVisits?.visits || promoterVisits.visits.length === 0) {
      toast.info('Nenhuma visita encontrada para este promotor no período selecionado');
      return;
    }

    setGeneratingBooking(true);
    try {
      await generatePhotoBooking(promoter, promoterVisits.visits, dateRange);
    } catch (error: any) {
      console.error('Erro ao gerar booking:', error);
      toast.error('Erro ao gerar booking: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGeneratingBooking(false);
    }
  }

  const formatOptions = [
    { value: 'pptx', label: 'PowerPoint (.pptx)', icon: '📊' },
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'excel', label: 'Excel', icon: '📈' },
    { value: 'html', label: 'HTML', icon: '🌐' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
          Relatórios
        </h1>
        <p className="text-text-secondary mt-2">
          Gere relatórios detalhados e exporte em diferentes formatos
        </p>
      </div>

      {/* Card de Exportação */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Exportar Relatório</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Selecione o período e formato para gerar o relatório
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <Input
                label="Data Inicial"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Data Final"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-700 mb-1.5">
                Formato de Exportação
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
              >
                {formatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleExport}
            isLoading={exporting}
            disabled={exporting}
            className="w-full md:w-auto"
          >
            {exporting ? 'Gerando Relatório...' : 'Gerar Relatório'}
          </Button>

          {/* Status da Exportação */}
          {exportStatus && (
            <Card gradient="primary" className="mt-6">
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Status da Exportação</h3>
                    <Badge
                      variant={
                        exportStatus.status === 'completed'
                          ? 'success'
                          : exportStatus.status === 'failed'
                          ? 'error'
                          : 'warning'
                      }
                      size="md"
                      className="bg-dark-card/20 text-white border-0"
                    >
                      {exportStatus.status === 'completed'
                        ? 'Concluído'
                        : exportStatus.status === 'failed'
                        ? 'Falhou'
                        : exportStatus.status === 'processing'
                        ? 'Processando'
                        : 'Pendente'}
                    </Badge>
                  </div>
                  {exportStatus.status === 'completed' && (
                    <Button variant="accent" size="md" onClick={handleDownload}>
                      ⬇️ Baixar Relatório
                    </Button>
                  )}
                </div>
                {exportStatus.status === 'processing' && exportStatus.progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-violet-100 text-sm">Progresso</span>
                      <span className="text-white font-semibold">{exportStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-dark-card/20 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-dark-card h-3 rounded-full transition-all duration-300"
                        style={{ width: `${exportStatus.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {exportStatus.status === 'failed' && (
                  <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                    <p className="text-red-100 text-sm">
                      Erro ao gerar relatório. Tente novamente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Booking de Fotos */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Booking de Fotos</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Gere um PDF com todas as fotos do promotor organizadas por loja e em ordem cronológica
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-700 mb-1.5">
                Selecionar Promotor
              </label>
              <select
                value={selectedPromoterId}
                onChange={(e) => setSelectedPromoterId(e.target.value)}
                className="w-full px-4 py-2.5 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all bg-dark-card text-text-primary"
              >
                <option value="">Selecione um promotor</option>
                {promotersData?.promoters?.map((promoter: any) => (
                  <option key={promoter.id} value={promoter.id}>
                    {promoter.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label="Data Inicial"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Data Final"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateBooking}
            isLoading={generatingBooking}
            disabled={generatingBooking || !selectedPromoterId || loadingVisits}
            className="w-full md:w-auto"
          >
            {generatingBooking ? 'Gerando Booking...' : '📸 Gerar Booking de Fotos'}
          </Button>

          {selectedPromoterId && promoterVisits?.visits && (
            <div className="mt-4 p-4 bg-primary-600/10 rounded-lg border border-primary-600/20">
              <p className="text-sm text-text-secondary">
                <strong>{promoterVisits.visits.length}</strong> visita(s) encontrada(s) no período selecionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relatório de Fotos Faltantes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Lojas sem Fotos Adicionais</h2>
              <p className="text-sm text-text-tertiary mt-1">
                Visitas com apenas fotos de check-in/checkout (sem fotos adicionais)
              </p>
            </div>
            {missingPhotos?.missingPhotos && (
              <Badge variant="warning" size="lg">
                {missingPhotos.missingPhotos.length} visita{missingPhotos.missingPhotos.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {!missingPhotos?.missingPhotos || missingPhotos.missingPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-semibold text-text-primary mb-2">
                    Nenhuma visita com fotos faltantes
                  </p>
                  <p className="text-sm text-text-tertiary">
                    Todas as visitas têm fotos adicionais no período selecionado
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-dark-backgroundSecondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Promotor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Loja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Fotos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Esperado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-card divide-y divide-gray-200">
                    {missingPhotos.missingPhotos.map((item: any) => (
                      <tr
                        key={item.visitId}
                        className="hover:bg-violet-50/50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white font-semibold shadow-md mr-3">
                              {item.promoter?.name?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            <span className="text-sm font-medium text-text-primary">
                              {item.promoter?.name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {item.store?.name || '-'}
                            </p>
                            <p className="text-xs text-text-tertiary">{item.store?.address || ''}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-tertiary">
                          {format(new Date(item.checkInAt), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={item.photoCount < (item.expectedPhotos || 3) ? 'error' : 'success'}
                            size="sm"
                          >
                            {item.photoCount || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-medium">
                          {item.expectedPhotos || 3}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
