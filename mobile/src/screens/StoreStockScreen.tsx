import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { colors } from '../styles/theme';
import {
  stockService,
  StoreStockItem,
  StoreSalesIndustry,
  StoreSalesResponse,
} from '../services/stockService';

function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return Math.round(n).toLocaleString('pt-BR');
}

function fmtMoney(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

type Tab = 'estoque' | 'vendas';

export default function StoreStockScreen({ route }: any) {
  const { storeId, storeName } = route.params || {};
  const [tab, setTab] = useState<Tab>('estoque');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StoreStockItem[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [totals, setTotals] = useState({ items: 0, rupturas: 0, baixoGiro: 0 });
  const [sales, setSales] = useState<StoreSalesResponse | null>(null);
  const [activeIndustry, setActiveIndustry] = useState<string>('');
  const [search, setSearch] = useState('');

  const loadStock = useCallback(async () => {
    if (!storeId) {
      setError('Loja não identificada');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await stockService.getStoreItems(storeId);
      setItems(data.items);
      setIndustries(data.industries);
      setTotals(data.totals);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Não foi possível carregar o estoque desta loja.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  const loadSales = useCallback(async () => {
    if (!storeId) return;
    try {
      const data = await stockService.getStoreSales(storeId);
      setSales(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Não foi possível carregar as vendas desta loja.');
    } finally {
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    if (tab === 'vendas' && !sales) {
      loadSales();
    }
  }, [tab, sales, loadSales]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = items;
    if (activeIndustry) list = list.filter((i) => i.industryName === activeIndustry);
    if (term) {
      list = list.filter(
        (i) =>
          i.productName.toLowerCase().includes(term) ||
          i.productCode.toLowerCase().includes(term)
      );
    }
    return list;
  }, [items, activeIndustry, search]);

  const renderItem = ({ item }: { item: StoreStockItem }) => {
    const ruptura = item.qty <= 0;
    return (
      <View style={[styles.itemCard, ruptura && styles.itemCardRuptura]}>
        <View style={styles.itemHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text style={[styles.qty, ruptura && styles.qtyRuptura]}>{fmtNumber(item.qty)}</Text>
        </View>
        <View style={styles.itemMetaRow}>
          <Text style={styles.metaText}>Cód {item.productCode}</Text>
          {item.dde !== null && <Text style={styles.metaText}>DDE {fmtNumber(item.dde)}</Text>}
        </View>
        <View style={styles.badgeRow}>
          {ruptura && (
            <View style={[styles.badge, styles.badgeError]}>
              <Text style={styles.badgeErrorText}>Ruptura</Text>
            </View>
          )}
          {item.lowTurn && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={styles.badgeWarningText}>Baixo giro</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSalesRow = ({ item }: { item: StoreSalesIndustry }) => (
    <View style={styles.itemCard}>
      <Text style={styles.productName}>{item.industryName}</Text>
      <View style={styles.salesGrid}>
        <View style={styles.salesCell}>
          <Text style={styles.metaText}>QTD</Text>
          <Text style={styles.salesValue}>{fmtNumber(item.qtyCurrent)}</Text>
        </View>
        <View style={styles.salesCell}>
          <Text style={styles.metaText}>Tend.</Text>
          <Text style={styles.salesValue}>{fmtNumber(item.qtyTrend)}</Text>
        </View>
        <View style={styles.salesCell}>
          <Text style={styles.metaText}>R$</Text>
          <Text style={styles.salesValue}>{fmtMoney(item.valueCurrent)}</Text>
        </View>
        <View style={styles.salesCell}>
          <Text style={styles.metaText}>Cresc.</Text>
          <Text
            style={[
              styles.salesValue,
              item.growthPct !== null && item.growthPct < 0 ? styles.qtyRuptura : styles.growthUp,
            ]}
          >
            {item.growthPct === null
              ? '-'
              : `${item.growthPct >= 0 ? '+' : ''}${item.growthPct.toFixed(1)}%`}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Carregando dados da loja...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName} numberOfLines={1}>
          {storeName || 'Relatório da loja'}
        </Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'estoque' && styles.tabActive]}
            onPress={() => setTab('estoque')}
          >
            <Text style={[styles.tabText, tab === 'estoque' && styles.tabTextActive]}>Estoque</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'vendas' && styles.tabActive]}
            onPress={() => setTab('vendas')}
          >
            <Text style={[styles.tabText, tab === 'vendas' && styles.tabTextActive]}>Vendas</Text>
          </TouchableOpacity>
        </View>
        {tab === 'estoque' ? (
          <View style={styles.totalsRow}>
            <Text style={styles.totalChip}>{totals.items} itens</Text>
            <Text style={[styles.totalChip, styles.totalChipError]}>{totals.rupturas} rupturas</Text>
            <Text style={[styles.totalChip, styles.totalChipWarning]}>
              {totals.baixoGiro} baixo giro
            </Text>
          </View>
        ) : (
          <View style={styles.totalsRow}>
            <Text style={styles.totalChip}>
              {fmtMoney(sales?.totals.valueCurrent || 0)}
            </Text>
            <Text
              style={[
                styles.totalChip,
                sales?.totals.growthPct !== null && (sales?.totals.growthPct || 0) < 0
                  ? styles.totalChipError
                  : styles.totalChipWarning,
              ]}
            >
              {sales?.totals.growthPct === null || sales?.totals.growthPct === undefined
                ? 's/ base'
                : `${sales.totals.growthPct >= 0 ? '+' : ''}${sales.totals.growthPct.toFixed(1)}%`}
            </Text>
          </View>
        )}
      </View>

      {tab === 'estoque' && (
        <>
          <TextInput
            style={styles.search}
            placeholder="Buscar produto ou código..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {industries.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsList}
              contentContainerStyle={styles.chipsContent}
            >
              {['', ...industries].map((ind) => {
                const active = activeIndustry === ind;
                return (
                  <TouchableOpacity
                    key={ind || 'all'}
                    onPress={() => setActiveIndustry(ind)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {ind || 'Todas'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : tab === 'estoque' ? (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadStock();
              }}
              tintColor={colors.primary[400]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nenhum item de estoque para esta loja.</Text>
              <Text style={styles.emptySubtext}>
                Aparece após importar o relatório Mateus e vincular a filial.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={sales?.byIndustry || []}
          keyExtractor={(i) => i.industryName}
          renderItem={renderSalesRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSales();
              }}
              tintColor={colors.primary[400]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sem vendas importadas para esta loja.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: colors.text.secondary, marginTop: 12 },
  errorText: { color: colors.text.secondary, textAlign: 'center' },
  emptyText: { color: colors.text.secondary, textAlign: 'center', fontSize: 15 },
  emptySubtext: { color: colors.text.tertiary, textAlign: 'center', marginTop: 8, fontSize: 13 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  storeName: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary[600] },
  tabText: { color: colors.text.tertiary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.text.primary },
  totalsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  totalChip: {
    color: colors.text.secondary,
    fontSize: 12,
    backgroundColor: colors.dark.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  totalChipError: { color: '#fecaca', backgroundColor: '#3a1f1f' },
  totalChipWarning: { color: '#fde68a', backgroundColor: '#3a2f1f' },
  search: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text.primary,
  },
  chipsList: { maxHeight: 44, flexGrow: 0 },
  chipsContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  chipText: { color: colors.text.secondary, fontSize: 13 },
  chipTextActive: { color: colors.text.primary, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 8, gap: 10 },
  itemCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 10,
  },
  itemCardRuptura: { borderColor: '#7f1d1d' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { color: colors.text.primary, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  qty: { color: colors.primary[300], fontSize: 18, fontWeight: '800' },
  qtyRuptura: { color: colors.accent[400] },
  growthUp: { color: '#34d399' },
  itemMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  metaText: { color: colors.text.tertiary, fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeError: { backgroundColor: '#7f1d1d' },
  badgeErrorText: { color: '#fecaca', fontSize: 11, fontWeight: '700' },
  badgeWarning: { backgroundColor: '#78350f' },
  badgeWarningText: { color: '#fde68a', fontSize: 11, fontWeight: '700' },
  salesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  salesCell: { width: '47%', backgroundColor: colors.dark.background, borderRadius: 8, padding: 8 },
  salesValue: { color: colors.text.primary, fontWeight: '700', marginTop: 2, fontSize: 13 },
});
