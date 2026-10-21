import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Store {
  id: string;
  name: string;
  code?: string;
  state?: string;
}

interface StoreStatus {
  storeId: string;
  storeName: string;
  stockLoja: number;
  stockCD: number;
  lastSale?: string;
  status: 'ok' | 'ruptura' | 'sem_registro' | 'cobertura_baixa';
}

interface SkuRow {
  sku: string;
  productName: string;
  stores: StoreStatus[];
}

interface MatrixData {
  matrix: SkuRow[];
  stores: Store[];
  totals: {
    totalSkus: number;
    totalStores: number;
    rupturas: number;
    semRegistro: number;
  };
}

async function fetchMatrix(params: { industryId?: string; state?: string; date?: string }): Promise<MatrixData> {
  const token = localStorage.getItem('token');
  const searchParams = new URLSearchParams();
  if (params.industryId) searchParams.set('industryId', params.industryId);
  if (params.state) searchParams.set('state', params.state);
  if (params.date) searchParams.set('date', params.date);
  
  const response = await fetch(`/api/tasks/sku-matrix?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Falha ao carregar matriz');
  return response.json();
}

async function fetchIndustries(): Promise<{ industries: Array<{ id: string; name: string }> }> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/industries', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Falha ao carregar indústrias');
  return response.json();
}

export default function SkuStoreMatrix() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: fetchIndustries,
  });

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ['sku-matrix', selectedIndustry, selectedState, selectedDate],
    queryFn: () => fetchMatrix({
      industryId: selectedIndustry || undefined,
      state: selectedState || undefined,
      date: selectedDate,
    }),
    enabled: !!selectedIndustry,
  });

  const industries = industriesData?.industries || [];
  const matrix = matrixData?.matrix || [];
  const stores = matrixData?.stores || [];
  const totals = matrixData?.totals;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ruptura':
        return 'bg-red-500 text-white';
      case 'sem_registro':
        return 'bg-pink-300 text-pink-900';
      case 'cobertura_baixa':
        return 'bg-orange-200 text-orange-900';
      case 'ok':
        return 'bg-green-100 text-green-900';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ruptura': return 'Ruptura';
      case 'sem_registro': return 'Sem reg.';
      case 'cobertura_baixa': return 'Cob. baixa';
      case 'ok': return 'OK';
      default: return '-';
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Matriz SKU × Loja</h1>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg min-w-[200px]"
          >
            <option value="">Selecione uma indústria</option>
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>{ind.name}</option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Todos os estados</option>
            <option value="MA">Maranhão</option>
            <option value="PI">Piauí</option>
          </select>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 text-sm mb-4">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-500 rounded"></span>
            Ruptura (estoque ≤ 0)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-pink-300 rounded"></span>
            Sem registro com venda
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-orange-200 rounded"></span>
            Cobertura baixa (DDE &lt; 15)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-100 rounded"></span>
            OK
          </span>
        </div>

        {/* Totais */}
        {totals && (
          <div className="flex gap-6 text-sm bg-gray-100 p-3 rounded-lg">
            <span><strong>{totals.totalSkus}</strong> SKUs</span>
            <span><strong>{totals.totalStores}</strong> lojas</span>
            <span className="text-red-600"><strong>{totals.rupturas}</strong> rupturas</span>
            <span className="text-pink-600"><strong>{totals.semRegistro}</strong> sem registro</span>
          </div>
        )}
      </div>

      {!selectedIndustry ? (
        <div className="text-center py-12 text-gray-500">
          Selecione uma indústria para ver a matriz
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : matrix.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum dado encontrado para os filtros selecionados
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#411A59] text-white">
                <th className="px-3 py-2 text-left font-medium border border-[#411A59] sticky left-0 bg-[#411A59] z-10">
                  Código
                </th>
                <th className="px-3 py-2 text-left font-medium border border-[#411A59] sticky left-[100px] bg-[#411A59] z-10 min-w-[200px]">
                  Descrição
                </th>
                <th className="px-3 py-2 text-center font-medium border border-[#411A59]">
                  CDs
                </th>
                <th className="px-3 py-2 text-center font-medium border border-[#411A59]">
                  Total
                </th>
                {stores.map((store) => (
                  <th 
                    key={store.id} 
                    className="px-2 py-2 text-center font-medium border border-[#411A59] min-w-[80px] text-xs"
                    title={store.name}
                  >
                    {store.code || store.name.substring(0, 8)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, idx) => {
                const totalCD = row.stores.reduce((sum, s) => sum + s.stockCD, 0);
                const totalStores = row.stores.length;
                
                return (
                  <tr key={row.sku} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-xs sticky left-0 bg-inherit z-10">
                      {row.sku}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 sticky left-[100px] bg-inherit z-10">
                      {row.productName}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center font-medium">
                      {totalCD}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center">
                      {totalStores}
                    </td>
                    {stores.map((store) => {
                      const storeData = row.stores.find(s => s.storeId === store.id);
                      if (!storeData) {
                        return (
                          <td key={store.id} className="px-2 py-2 border border-gray-200 text-center bg-gray-100">
                            -
                          </td>
                        );
                      }
                      return (
                        <td 
                          key={store.id} 
                          className={`px-2 py-2 border border-gray-200 text-center ${getStatusColor(storeData.status)}`}
                          title={`Loja: ${storeData.stockLoja} | CD: ${storeData.stockCD}`}
                        >
                          {storeData.stockLoja}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
