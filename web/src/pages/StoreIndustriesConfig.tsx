import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supervisorService } from '../services/supervisorService';
import { industryService } from '../services/industryService';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

interface Store {
  id: string;
  name: string;
  address: string;
}

interface Industry {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export default function StoreIndustriesConfig() {
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar lojas
  const { data: storesData, isLoading: loadingStores } = useQuery({
    queryKey: ['all-stores'],
    queryFn: () => supervisorService.getAllStores(),
  });

  // Buscar todas as indústrias
  const { data: industriesData, isLoading: loadingIndustries } = useQuery({
    queryKey: ['industries'],
    queryFn: () => industryService.listIndustries(),
  });

  // Buscar indústrias da loja selecionada
  const { data: storeIndustriesData, isLoading: loadingStoreIndustries } = useQuery({
    queryKey: ['store-industries', selectedStore],
    queryFn: () => supervisorService.getStoreIndustries(selectedStore),
    enabled: !!selectedStore,
  });

  // Mutation para salvar indústrias da loja
  const saveIndustriesMutation = useMutation({
    mutationFn: (industryIds: string[]) =>
      supervisorService.updateStoreIndustries(selectedStore, industryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-industries', selectedStore] });
      queryClient.invalidateQueries({ queryKey: ['all-store-industries'] });
      alert('Indústrias configuradas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao configurar indústrias:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao configurar indústrias';
      alert(`Erro: ${errorMessage}`);
    },
  });

  // Carregar indústrias da loja quando selecionada
  useEffect(() => {
    if (storeIndustriesData?.industries) {
      setSelectedIndustries(storeIndustriesData.industries.map((i: Industry) => i.id));
    } else {
      setSelectedIndustries([]);
    }
  }, [storeIndustriesData]);

  const stores = storesData?.stores || [];
  const industries = (industriesData as any)?.industries || industriesData || [];

  // Filtrar indústrias por busca
  const filteredIndustries = industries.filter(
    (industry: Industry) =>
      industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      industry.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleIndustryToggle(industryId: string) {
    setSelectedIndustries((prev) =>
      prev.includes(industryId) ? prev.filter((id) => id !== industryId) : [...prev, industryId]
    );
  }

  function handleSave() {
    if (!selectedStore) {
      alert('Selecione uma loja');
      return;
    }
    saveIndustriesMutation.mutate(selectedIndustries);
  }

  function handleClear() {
    setSelectedIndustries([]);
  }

  function handleSelectAll() {
    setSelectedIndustries(industries.map((i: Industry) => i.id));
  }

  const selectedStoreData = stores.find((s: Store) => s.id === selectedStore);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Configurar Indústrias por Loja</h1>
          <p className="text-text-secondary mt-1">
            Defina quais indústrias cada loja deve ter cobertura fotográfica
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seleção de Loja */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">1. Selecione a Loja</h2>
          </CardHeader>
          <CardContent>
            {loadingStores ? (
              <div className="text-text-secondary">Carregando lojas...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stores.map((store: Store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedStore === store.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-dark-border bg-dark-card hover:bg-dark-cardElevated text-text-primary'
                    }`}
                  >
                    <div className="font-medium">{store.name}</div>
                    <div className="text-sm text-text-secondary truncate">{store.address}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Indústrias */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text-primary">2. Selecione as Indústrias</h2>
              {selectedStore && (
                <div className="flex gap-2">
                  <Badge variant="primary">
                    {selectedIndustries.length} selecionadas
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStore ? (
              <div className="text-center py-8 text-text-secondary">
                <p>Selecione uma loja para configurar suas indústrias</p>
              </div>
            ) : loadingIndustries || loadingStoreIndustries ? (
              <div className="text-text-secondary">Carregando indústrias...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar indústria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    Selecionar Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    Limpar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {filteredIndustries.map((industry: Industry) => {
                    const isSelected = selectedIndustries.includes(industry.id);
                    return (
                      <button
                        key={industry.id}
                        onClick={() => handleIndustryToggle(industry.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-success bg-success/10'
                            : 'border-dark-border bg-dark-card hover:bg-dark-cardElevated'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-success bg-success text-white'
                              : 'border-dark-border'
                          }`}
                        >
                          {isSelected && <span>✓</span>}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-text-primary">{industry.name}</div>
                          <div className="text-xs text-text-secondary font-mono">{industry.code}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedStore && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-dark-border">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saveIndustriesMutation.isPending}
                    >
                      {saveIndustriesMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo da Loja Selecionada */}
      {selectedStoreData && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Resumo</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="bg-dark-background p-4 rounded-lg flex-1 min-w-[200px]">
                <div className="text-text-secondary text-sm">Loja</div>
                <div className="text-text-primary font-semibold">{selectedStoreData.name}</div>
              </div>
              <div className="bg-dark-background p-4 rounded-lg flex-1 min-w-[200px]">
                <div className="text-text-secondary text-sm">Indústrias Configuradas</div>
                <div className="text-text-primary font-semibold">{selectedIndustries.length}</div>
              </div>
              <div className="bg-dark-background p-4 rounded-lg flex-1 min-w-[200px]">
                <div className="text-text-secondary text-sm">Status</div>
                <div className="text-text-primary font-semibold">
                  {selectedIndustries.length > 0 ? (
                    <Badge variant="success">Configurado</Badge>
                  ) : (
                    <Badge variant="warning">Sem indústrias</Badge>
                  )}
                </div>
              </div>
            </div>
            {selectedIndustries.length > 0 && (
              <div className="mt-4">
                <div className="text-text-secondary text-sm mb-2">Indústrias obrigatórias:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedIndustries.map((id) => {
                    const industry = industries.find((i: Industry) => i.id === id);
                    return industry ? (
                      <Badge key={id} variant="gray">
                        {industry.code} - {industry.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

