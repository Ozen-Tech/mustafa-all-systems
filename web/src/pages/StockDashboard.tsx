import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stockService, SalesGroupBy } from '../services/stockService';
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

const selectClass =
  'px-3 py-2 bg-dark-cardElevated border border-dark-border rounded-xl text-text-primary text-sm min-w-[140px]';

export default function StockDashboard() {
  const [industryName, setIndustryName] = useState('');
  const [tab, setTab] = useState<Tab>('estoque');
  const [state, setState] = useState('');
  const [storeId, setStoreId] = useState('');
  const [month, setMonth] = useState<string>('');
  const [product, setProduct] = useState('');
  const [productDraft, setProductDraft] = useState('');
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('industry');
  const [monthTouched, setMonthTouched] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['stock-overview', industryName],
    queryFn: () => stockService.getOverview(industryName ? { industryName } : {}),
  });

  const { data: byStore = [] } = useQuery({
    queryKey: ['stock-by-store', industryName],
    queryFn: () => stockService.getByStore(industryName ? { industryName } : {}),
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['stock-sales', industryName, state, storeId, month, monthTouched, product, groupBy],
    queryFn: () =>
      stockService.getSales({
        industryName: industryName || undefined,
        state: state || undefined,
        storeId: storeId || undefined,
        month: monthTouched ? month || undefined : undefined,
        product: product || undefined,
        groupBy,
      }),
    enabled: tab === 'vendas',
  });

  // Sincroniza mês padrão retornado pela API na primeira carga
  React.useEffect(() => {
    if (sales?.month && !monthTouched) {
      setMonth(sales.month);
    }
  }, [sales?.month, monthTouched]);

  const industries = overview?.byIndustry.map((i) => i.industryName) || sales?.filters.industries || [];
  const filterMonths = sales?.filters.months || [];
  const filterStates = sales?.filters.states || [];
  const filterStores = (sales?.filters.stores || []).filter((s) => !state || s.state === state);
  const tableRows = sales?.rows || [];

  const firstColLabel =
    groupBy === 'store' ? 'Loja' : groupBy === 'product' ? 'Produto' : 'Indústria';

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
            className={selectClass}
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
          <Card>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-text-tertiary">
                    Mês
                    <select
                      value={month}
                      onChange={(e) => {
                        setMonthTouched(true);
                        setMonth(e.target.value);
                      }}
                      className={selectClass}
                    >
                      <option value="">Último com dados</option>
                      {filterMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-tertiary">
                    Estado
                    <select
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setStoreId('');
                      }}
                      className={selectClass}
                    >
                      <option value="">Todos</option>
                      {filterStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-tertiary">
                    Loja
                    <select
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      className={`${selectClass} min-w-[220px]`}
                    >
                      <option value="">Todas</option>
                      {filterStores.map((s) => (
                        <option key={s.storeId || s.filialCode} value={s.storeId || ''}>
                          [{s.filialCode}] {s.filialName}
                          {s.state ? ` · ${s.state}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-tertiary flex-1 min-w-[200px]">
                    Produto
                    <div className="flex gap-2">
                      <input
                        value={productDraft}
                        onChange={(e) => setProductDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setProduct(productDraft.trim());
                        }}
                        placeholder="Código ou nome…"
                        className={`${selectClass} flex-1`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setProduct(productDraft.trim())}
                      >
                        Buscar
                      </Button>
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-tertiary">
                    Agrupar por
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as SalesGroupBy)}
                      className={selectClass}
                    >
                      <option value="industry">Indústria</option>
                      <option value="store">Loja</option>
                      <option value="product">Produto</option>
                    </select>
                  </label>
                  {(state || storeId || product || monthTouched || groupBy !== 'industry') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setState('');
                        setStoreId('');
                        setProduct('');
                        setProductDraft('');
                        setMonthTouched(false);
                        setMonth('');
                        setGroupBy('industry');
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">
                  Valores do mês selecionado (não o acumulado do ano). Tendência = projeção estilo Mateus
                  (≈ 2× no mês parcial).
                  {sales?.month ? ` Exibindo: ${sales.month}.` : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Faturamento atual</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtMoney(sales?.totals.valueCurrent || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Faturamento anterior</div>
                <div className="text-2xl font-bold text-text-secondary mt-2">
                  {fmtMoney(sales?.totals.valuePrevious || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Qtd atual</div>
                <div className="text-2xl font-bold text-text-primary mt-2">
                  {fmtInt(sales?.totals.qtyCurrent || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-text-tertiary text-sm">Cresc. R$</div>
                <div className="text-2xl font-bold text-accent-400 mt-2">
                  {growthBadge(sales?.totals.growthPct ?? null)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">
                Venda Geral por {groupBy === 'store' ? 'loja' : groupBy === 'product' ? 'produto' : 'indústria'}
              </h2>
              <p className="text-sm text-text-tertiary mt-1">
                Colunas no estilo da planilha Mateus: QTD, tendência, R$ e crescimento %.
              </p>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="text-text-secondary p-4">Carregando vendas...</div>
              ) : (
                <div className="table-shell overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>{firstColLabel}</th>
                        {groupBy === 'product' && <th>Indústria</th>}
                        {groupBy === 'store' && <th>UF</th>}
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
                      {tableRows.map((r) => (
                        <tr key={r.key}>
                          <td className="text-text-primary font-medium">{r.label}</td>
                          {groupBy === 'product' && (
                            <td className="text-text-tertiary">{r.sublabel || r.industryName || '-'}</td>
                          )}
                          {groupBy === 'store' && (
                            <td className="text-text-tertiary">{r.sublabel || r.state || '-'}</td>
                          )}
                          <td className="text-right">{fmtInt(r.qtyCurrent)}</td>
                          <td className="text-right text-text-tertiary">{fmtInt(r.qtyPrevious)}</td>
                          <td className="text-right">{fmtInt(r.qtyTrend)}</td>
                          <td className="text-right">{growthBadge(r.qtyGrowthPct)}</td>
                          <td className="text-right">{fmtMoney(r.valueCurrent)}</td>
                          <td className="text-right text-text-tertiary">{fmtMoney(r.valuePrevious)}</td>
                          <td className="text-right">{growthBadge(r.growthPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableRows.length === 0 && (
                    <div className="text-text-tertiary p-4">
                      Sem dados de vendas para estes filtros. Reimporte os relatórios Mateus para gravar
                      mês/produto corretamente.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
