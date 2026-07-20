import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supervisorService } from '../services/supervisorService';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toaster';

export default function Settings() {
  const queryClient = useQueryClient();
  const [selectedPromoter, setSelectedPromoter] = useState<string>('');
  const [expectedPhotos, setExpectedPhotos] = useState<number>(10);

  const { data: promotersData } = useQuery({
    queryKey: ['promoters'],
    queryFn: () => supervisorService.getPromoters(),
  });

  const setQuotaMutation = useMutation({
    mutationFn: (data: { promoterId: string; expectedPhotos: number }) =>
      supervisorService.setPhotoQuota(data.promoterId, data.expectedPhotos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoters'] });
      toast.success('Quota de fotos configurada com sucesso!');
      setSelectedPromoter('');
      setExpectedPhotos(10);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao configurar quota');
    },
  });

  function handleSetQuota() {
    if (!selectedPromoter) {
      toast.info('Selecione um promotor');
      return;
    }

    if (expectedPhotos <= 0) {
      toast.warning('A quantidade esperada deve ser maior que zero');
      return;
    }

    setQuotaMutation.mutate({
      promoterId: selectedPromoter,
      expectedPhotos,
    });
  }

  const promoters = promotersData?.promoters || [];
  const selectedPromoterData = promoters.find((p: any) => p.id === selectedPromoter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-text-secondary mt-2">
          Gerencie as configurações do sistema e dos promotores
        </p>
      </div>

      {/* Configurar Quota de Fotos */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-text-primary">Configurar Quota de Fotos</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Defina a quantidade esperada de fotos por visita para cada promotor
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-700 mb-1.5">
                Promotor
              </label>
              <select
                value={selectedPromoter}
                onChange={(e) => setSelectedPromoter(e.target.value)}
                className="w-full px-4 py-2.5 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all"
              >
                <option value="">Selecione um promotor</option>
                {promoters.map((promoter: any) => (
                  <option key={promoter.id} value={promoter.id}>
                    {promoter.name} ({promoter.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Input
                label="Quantidade Esperada de Fotos"
                type="number"
                min="1"
                value={expectedPhotos.toString()}
                onChange={(e) => setExpectedPhotos(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {selectedPromoterData && (
            <Card gradient="primary" className="mb-6">
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-dark-card/20 flex items-center justify-center text-white font-semibold">
                    {selectedPromoterData.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedPromoterData.name}</p>
                    <p className="text-primary-400 text-sm">{selectedPromoterData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary-400 text-sm">Quota atual:</span>
                  <Badge variant="accent" size="md" className="bg-dark-card/20 text-white border-0">
                    {expectedPhotos} fotos
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleSetQuota}
            isLoading={setQuotaMutation.isPending}
            disabled={!selectedPromoter || expectedPhotos <= 0}
            className="w-full md:w-auto"
          >
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card gradient="primary">
          <CardContent>
            <h3 className="text-lg font-semibold text-white mb-4">Sistema</h3>
            <div className="space-y-3">
              <div>
                <p className="text-primary-400 text-sm mb-1">Versão</p>
                <p className="text-white font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-primary-400 text-sm mb-1">Status</p>
                <Badge variant="success" size="sm" className="bg-dark-card/20 text-white border-0">
                  Operacional
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card gradient="accent">
          <CardContent>
            <h3 className="text-lg font-semibold text-white mb-4">Estatísticas</h3>
            <div className="space-y-3">
              <div>
                <p className="text-amber-100 text-sm mb-1">Total de Promotores</p>
                <p className="text-white text-2xl font-bold">{promoters.length}</p>
              </div>
              <div>
                <p className="text-amber-100 text-sm mb-1">Sistema Ativo</p>
                <Badge variant="success" size="sm" className="bg-dark-card/20 text-white border-0">
                  Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
