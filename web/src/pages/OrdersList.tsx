import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  chainService,
  currentPeriod,
  formatBRL,
  orderService,
  PurchaseOrder,
} from '../services/commercialService';
import { industryService } from '../services/industryService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function OrdersList() {
  const [month, setMonth] = useState(currentPeriod());
  const [chainId, setChainId] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: chains = [] } = useQuery({
    queryKey: ['chains-active'],
    queryFn: () => chainService.list(true),
  });
  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: () => industryService.listIndustries(),
  });

  const params = useMemo(
    () => ({
      month: month || undefined,
      chainId: chainId || undefined,
      industryId: industryId || undefined,
      search: search || undefined,
      limit: 150,
    }),
    [month, chainId, industryId, search]
  );

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderService.list(params),
  });

  const { data: summary } = useQuery({
    queryKey: ['orders-summary', month, chainId],
    queryFn: () =>
      orderService.summary({
        month: month || undefined,
        chainId: chainId || undefined,
        groupBy: 'industry',
      }),
  });

  const { data: detail } = useQuery({
    queryKey: ['order', selectedId],
    queryFn: () => orderService.get(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pedidos por indústria</h1>
          <p className="text-text-secondary text-sm mt-1">
            Pedidos importados das planilhas das redes (Mateus, Assaí, Atacadão…).
          </p>
        </div>
        <Link to="/pedidos/import">
          <Button>Importar planilha</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-text-secondary">Pedidos no período</div>
            <div className="text-2xl font-bold text-text-primary">
              {summary?.totals.orderCount ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-text-secondary">Valor total</div>
            <div className="text-2xl font-bold text-text-primary">
              {formatBRL(summary?.totals.totalValue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-text-secondary">Volume (qtd)</div>
            <div className="text-2xl font-bold text-text-primary">
              {(summary?.totals.totalQty || 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Mês"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <div>
              <label className="block text-sm text-text-secondary mb-1">Rede</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
              >
                <option value="">Todas</option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Indústria</label>
              <select
                className="w-full bg-dark-background border border-dark-border rounded-lg px-3 py-2 text-text-primary"
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
              >
                <option value="">Todas</option>
                {industries.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Busca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pedido, filial, indústria..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Lista</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-text-secondary">Carregando...</p>
            ) : orders.length === 0 ? (
              <p className="text-text-secondary">Nenhum pedido neste filtro.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-secondary border-b border-dark-border">
                      <th className="py-2 pr-2">Data</th>
                      <th className="py-2 pr-2">Rede</th>
                      <th className="py-2 pr-2">Indústria</th>
                      <th className="py-2 pr-2">Filial</th>
                      <th className="py-2 pr-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: PurchaseOrder) => (
                      <tr
                        key={o.id}
                        className={`border-b border-dark-border/50 cursor-pointer hover:bg-primary-600/5 ${
                          selectedId === o.id ? 'bg-primary-600/10' : ''
                        }`}
                        onClick={() => setSelectedId(o.id)}
                      >
                        <td className="py-2 pr-2 text-text-primary">
                          {new Date(o.orderDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2 pr-2 text-text-secondary">{o.chain?.name || '—'}</td>
                        <td className="py-2 pr-2 text-text-primary">{o.industryName}</td>
                        <td className="py-2 pr-2 text-text-secondary">
                          [{o.filialCode}] {o.store?.name || o.filialName}
                          {!o.storeId && (
                            <Badge variant="warning" className="ml-1">
                              sem loja
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 text-right text-text-primary font-medium">
                          {formatBRL(o.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-text-primary">Detalhe</h2>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <p className="text-text-secondary text-sm">Selecione um pedido.</p>
            ) : !detail ? (
              <p className="text-text-secondary text-sm">Carregando...</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-semibold text-text-primary">
                    {detail.orderNumber || 'Sem número'}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {detail.industryName} · {detail.chain?.name}
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  Filial: [{detail.filialCode}] {detail.store?.name || detail.filialName}
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Qtd: </span>
                    <span className="text-text-primary font-medium">
                      {detail.totalQty.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Valor: </span>
                    <span className="text-text-primary font-medium">
                      {formatBRL(detail.totalValue)}
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {(detail.items || []).map((it) => (
                    <div
                      key={it.id}
                      className="flex justify-between text-xs py-1.5 border-b border-dark-border/40"
                    >
                      <div>
                        <div className="text-text-primary">{it.productName}</div>
                        <div className="text-text-secondary">{it.productCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-text-primary">{it.qty}</div>
                        <div className="text-text-secondary">{formatBRL(it.totalValue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
