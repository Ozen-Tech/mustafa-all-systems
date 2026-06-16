import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockService } from '../services/stockService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

function fmtInt(n: number) {
  return Math.round(n).toLocaleString('pt-BR');
}
function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

type Tab = 'estoque' | 'vendas';

export default function StockDashboard() {
  const [industryName, setIndustryName] = useState('');
  const [tab, setTab] = useState<Tab>('estoque');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['stock-overview', industryName],
    queryFn: () => stockService.getOverview(industryName ? { industryName } : {}),
  });

  const { data: byStore = [] } = useQuery({
    queryKey: ['stock-by-store', industryName],
    queryFn: () => stockService.getByStore(industryName ? { industryName } : {}),
  });

  const { data: sales } = useQuery({
    queryKey: ['stock-sales', industryName],
    queryFn: () => stockService.getSales(industryName ? { industryName } : {}),
    enabled: tab === 'vendas',
  });

  const industries = overview?.byIndustry.map((i) => i.industryName) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Estoque e Vendas</h1>
          <p className="text-text-secondary mt-1">
            {overview?.lastImport
              ? `Última importação: ${new Date(overview.lastImport.createdAt).toLocaleString('pt-BR')}`
              : 'Nenhuma importação ainda'}
          </p>
        </div>
        <select
          value={industryName}
          onChange={(e) => setIndustryName(e.target.value)}
          className="px-4 py-2 bg-dark-backgroundSecondary border border-dark-border rounded-lg text-text-primary"
        >
          <option value="">Todas as indústrias</option>
          {industries.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('estoque')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'estoque'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-600'
              : 'text-text-secondary hover:bg-dark-card'
          }`}
        >
          Estoque
        </button>
        <button
          onClick={() => setTab('vendas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'vendas'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-600'
              : 'text-text-secondary hover:bg-dark-card'
          }`}
        >
          Vendas / Tendência
        </button>
      </div>

      {isLoading ? (
        <div className="text-text-secondary">Carregando...</div>
      ) : tab === 'estoque' ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-text-secondary text-sm">Valor em loja</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtMoney(overview?.loja.valueRs || 0)}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {fmtInt(overview?.loja.items || 0)} itens
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-secondary text-sm">Qtd em loja</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtInt(overview?.loja.qty || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-secondary text-sm">Rupturas (qtd 0)</div>
                <div className="text-2xl font-bold text-error-500 mt-2">
                  {fmtInt(overview?.loja.rupturas || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-secondary text-sm">Baixo giro</div>
                <div className="text-2xl font-bold text-warning-500 mt-2">
                  {fmtInt(overview?.loja.baixoGiro || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por indústria */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary">Estoque por indústria</h2>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-tertiary text-left border-b border-dark-border">
                        <th className="py-2 pr-4">Indústria</th>
                        <th className="py-2 pr-4 text-right">Qtd</th>
                        <th className="py-2 pr-4 text-right">Valor</th>
                        <th className="py-2 pr-4 text-right">Itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview?.byIndustry.map((r) => (
                        <tr key={r.industryName} className="border-b border-dark-border/50">
                          <td className="py-2 pr-4 text-text-primary">{r.industryName}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{fmtInt(r.qty)}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{fmtMoney(r.valueRs)}</td>
                          <td className="py-2 pr-4 text-right text-text-tertiary">{fmtInt(r.items)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Por CD */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary">Estoque nos CDs</h2>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-tertiary text-left border-b border-dark-border">
                        <th className="py-2 pr-4">CD</th>
                        <th className="py-2 pr-4 text-right">Qtd</th>
                        <th className="py-2 pr-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview?.byCd.map((r) => (
                        <tr key={r.cd} className="border-b border-dark-border/50">
                          <td className="py-2 pr-4 text-text-primary">{r.cd}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{fmtInt(r.qty)}</td>
                          <td className="py-2 pr-4 text-right text-text-secondary">{fmtMoney(r.valueRs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por loja */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">Estoque por loja (top 500)</h2>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-tertiary text-left border-b border-dark-border">
                      <th className="py-2 pr-4">Filial</th>
                      <th className="py-2 pr-4">UF</th>
                      <th className="py-2 pr-4 text-right">Qtd</th>
                      <th className="py-2 pr-4 text-right">Valor</th>
                      <th className="py-2 pr-4 text-right">Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStore.map((r) => (
                      <tr key={r.filialCode} className="border-b border-dark-border/50">
                        <td className="py-2 pr-4 text-text-primary">
                          [{r.filialCode}] {r.filialName}
                        </td>
                        <td className="py-2 pr-4 text-text-tertiary">{r.state || '-'}</td>
                        <td className="py-2 pr-4 text-right text-text-secondary">{fmtInt(r.qty)}</td>
                        <td className="py-2 pr-4 text-right text-text-secondary">{fmtMoney(r.valueRs)}</td>
                        <td className="py-2 pr-4 text-right text-text-tertiary">{fmtInt(r.items)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Vendas */
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Vendas por indústria</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-tertiary text-left border-b border-dark-border">
                    <th className="py-2 pr-4">Indústria</th>
                    <th className="py-2 pr-4 text-right">Valor (atual)</th>
                    <th className="py-2 pr-4 text-right">Valor (anterior)</th>
                    <th className="py-2 pr-4 text-right">Crescimento</th>
                  </tr>
                </thead>
                <tbody>
                  {sales?.byIndustry.map((r) => (
                    <tr key={r.industryName} className="border-b border-dark-border/50">
                      <td className="py-2 pr-4 text-text-primary">{r.industryName}</td>
                      <td className="py-2 pr-4 text-right text-text-secondary">{fmtMoney(r.valueCurrent)}</td>
                      <td className="py-2 pr-4 text-right text-text-tertiary">{fmtMoney(r.valuePrevious)}</td>
                      <td className="py-2 pr-4 text-right">
                        {r.growthPct === null ? (
                          <span className="text-text-tertiary">-</span>
                        ) : (
                          <Badge variant={r.growthPct >= 0 ? 'success' : 'error'}>
                            {r.growthPct >= 0 ? '+' : ''}
                            {r.growthPct.toFixed(1)}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!sales || sales.byIndustry.length === 0) && (
                <div className="text-text-tertiary mt-4">Sem dados de vendas importados.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
