import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stockService } from '../services/stockService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

function fmtInt(n: number) {
  return Math.round(n).toLocaleString('pt-BR');
}
function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function growthBadge(pct: number | null) {
  if (pct === null) return <span className="text-text-tertiary">-</span>;
  return (
    <Badge variant={pct >= 0 ? 'success' : 'error'}>
      {pct >= 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </Badge>
  );
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
    <div className="page-shell">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">Estoque e Vendas</h1>
          <p className="page-subtitle">
            {overview?.lastImport
              ? `Última importação: ${new Date(overview.lastImport.createdAt).toLocaleString('pt-BR')}${
                  overview.lastImport.weekLabel ? ` · ${overview.lastImport.weekLabel}` : ''
                }`
              : 'Nenhuma importação ainda'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={industryName}
            onChange={(e) => setIndustryName(e.target.value)}
            className="px-4 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary"
          >
            <option value="">Todas as indústrias</option>
            {industries.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Link to="/stock/import">
            <Button variant="outline" size="sm">
              Importar relatório
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-dark-backgroundSecondary border border-dark-border w-fit">
        {(['estoque', 'vendas'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary-600/20 text-primary-300 border border-primary-600/40'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            {t === 'estoque' ? 'Estoque' : 'Venda Geral'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-text-secondary">Carregando...</div>
      ) : tab === 'estoque' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Valor em loja', value: fmtMoney(overview?.loja.valueRs || 0), hint: `${fmtInt(overview?.loja.items || 0)} itens` },
              { label: 'Qtd em loja', value: fmtInt(overview?.loja.qty || 0) },
              { label: 'Rupturas (qtd 0)', value: fmtInt(overview?.loja.rupturas || 0), tone: 'text-error-400' },
              { label: 'Baixo giro', value: fmtInt(overview?.loja.baixoGiro || 0), tone: 'text-warning-400' },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent>
                  <div className="text-text-tertiary text-sm">{kpi.label}</div>
                  <div className={`text-2xl font-bold mt-2 ${kpi.tone || 'text-text-primary'}`}>{kpi.value}</div>
                  {kpi.hint && <div className="text-xs text-text-disabled mt-1">{kpi.hint}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary">Estoque por indústria</h2>
              </CardHeader>
              <CardContent>
                <div className="table-shell max-h-96 overflow-y-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Indústria</th>
                        <th className="text-right">Qtd</th>
                        <th className="text-right">Valor</th>
                        <th className="text-right">Itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview?.byIndustry.map((r) => (
                        <tr key={r.industryName}>
                          <td className="text-text-primary">{r.industryName}</td>
                          <td className="text-right">{fmtInt(r.qty)}</td>
                          <td className="text-right">{fmtMoney(r.valueRs)}</td>
                          <td className="text-right text-text-tertiary">{fmtInt(r.items)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary">Estoque nos CDs</h2>
              </CardHeader>
              <CardContent>
                <div className="table-shell max-h-96 overflow-y-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>CD</th>
                        <th className="text-right">Qtd</th>
                        <th className="text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview?.byCd.map((r) => (
                        <tr key={r.cd}>
                          <td className="text-text-primary">{r.cd}</td>
                          <td className="text-right">{fmtInt(r.qty)}</td>
                          <td className="text-right">{fmtMoney(r.valueRs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">Estoque por loja (top 500)</h2>
            </CardHeader>
            <CardContent>
              <div className="table-shell max-h-[500px] overflow-y-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Filial</th>
                      <th>UF</th>
                      <th className="text-right">Qtd</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right">Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStore.map((r) => (
                      <tr key={r.filialCode}>
                        <td className="text-text-primary">
                          [{r.filialCode}] {r.filialName}
                        </td>
                        <td className="text-text-tertiary">{r.state || '-'}</td>
                        <td className="text-right">{fmtInt(r.qty)}</td>
                        <td className="text-right">{fmtMoney(r.valueRs)}</td>
                        <td className="text-right text-text-tertiary">{fmtInt(r.items)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Faturamento atual</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtMoney(sales?.byIndustry.reduce((s, r) => s + r.valueCurrent, 0) || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Faturamento anterior</div>
                <div className="text-2xl font-bold text-text-secondary mt-2">
                  {fmtMoney(sales?.byIndustry.reduce((s, r) => s + r.valuePrevious, 0) || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Qtd atual</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtInt(sales?.byIndustry.reduce((s, r) => s + r.qtyCurrent, 0) || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Indústrias</div>
                <div className="text-2xl font-bold text-accent-400 mt-2">
                  {fmtInt(sales?.byIndustry.length || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">Venda Geral por indústria</h2>
              <p className="text-sm text-text-tertiary mt-1">
                Colunas no estilo da planilha Mateus: QTD, tendência, R$ e crescimento %.
              </p>
            </CardHeader>
            <CardContent>
              <div className="table-shell overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Indústria</th>
                      <th className="text-right">QTD atual</th>
                      <th className="text-right">QTD ant.</th>
                      <th className="text-right">Tend. QTD</th>
                      <th className="text-right">Cresc. QTD</th>
                      <th className="text-right">R$ atual</th>
                      <th className="text-right">R$ ant.</th>
                      <th className="text-right">Cresc. R$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales?.byIndustry.map((r: any) => (
                      <tr key={r.industryName}>
                        <td className="text-text-primary font-medium">{r.industryName}</td>
                        <td className="text-right">{fmtInt(r.qtyCurrent)}</td>
                        <td className="text-right text-text-tertiary">{fmtInt(r.qtyPrevious)}</td>
                        <td className="text-right">{fmtInt(r.qtyTrend ?? r.qtyCurrent * 2)}</td>
                        <td className="text-right">{growthBadge(r.qtyGrowthPct ?? null)}</td>
                        <td className="text-right">{fmtMoney(r.valueCurrent)}</td>
                        <td className="text-right text-text-tertiary">{fmtMoney(r.valuePrevious)}</td>
                        <td className="text-right">{growthBadge(r.growthPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!sales || sales.byIndustry.length === 0) && (
                  <div className="text-text-tertiary p-4">Sem dados de vendas importados.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
