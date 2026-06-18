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
} from 'react-native';
import { colors, theme } from '../styles/theme';
import { stockService, StoreStockItem } from '../services/stockService';

function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return Math.round(n).toLocaleString('pt-BR');
}

export default function StoreStockScreen({ route }: any) {
  const { storeId, storeName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StoreStockItem[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [totals, setTotals] = useState({ items: 0, rupturas: 0, baixoGiro: 0 });
  const [activeIndustry, setActiveIndustry] = useState<string>('');
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (industryName?: string) => {
      if (!storeId) {
        setError('Loja não identificada');
        setLoading(false);
        return;
      }
      try {
        setError(null);
        const data = await stockService.getStoreItems(storeId, {
          industryName: industryName || undefined,
        });
        setItems(data.items);
        setIndustries(data.industries);
        setTotals(data.totals);
      } catch (e: any) {
        setError(
          e?.response?.data?.message || 'Não foi possível carregar o estoque desta loja.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    load();
  }, [load]);

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
          {item.idade !== null && <Text style={styles.metaText}>Idade {fmtNumber(item.idade)}d</Text>}
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
          {item.status && (
            <Text style={styles.statusText} numberOfLines={1}>
              {item.status}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Carregando estoque...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName} numberOfLines={1}>
          {storeName || 'Estoque da loja'}
        </Text>
        <View style={styles.totalsRow}>
          <Text style={styles.totalChip}>{totals.items} itens</Text>
          <Text style={[styles.totalChip, styles.totalChipError]}>{totals.rupturas} rupturas</Text>
          <Text style={[styles.totalChip, styles.totalChipWarning]}>
            {totals.baixoGiro} baixo giro
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar produto ou código..."
        placeholderTextColor={colors.text.tertiary}
        value={search}
        onChangeText={setSearch}
      />

      {industries.length > 1 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['', ...industries]}
          keyExtractor={(i) => i || 'all'}
          style={styles.chipsList}
          contentContainerStyle={styles.chipsContent}
          renderItem={({ item: ind }) => {
            const active = activeIndustry === ind;
            return (
              <TouchableOpacity
                onPress={() => setActiveIndustry(ind)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {ind || 'Todas'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
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
                load(activeIndustry);
              }}
              tintColor={colors.primary[400]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                Nenhum item de estoque encontrado para esta loja.
              </Text>
              <Text style={styles.emptySubtext}>
                Os dados aparecem após a importação do relatório semanal e o vínculo da filial.
              </Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  storeName: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
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
  totalChipError: { color: colors.accent[300], backgroundColor: '#3a1f1f' },
  totalChipWarning: { color: colors.accent[400], backgroundColor: '#3a2f1f' },
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
  },
  itemCardRuptura: { borderColor: '#7f1d1d' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { color: colors.text.primary, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  qty: { color: colors.primary[300], fontSize: 18, fontWeight: '800' },
  qtyRuptura: { color: colors.accent[400] },
  itemMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  metaText: { color: colors.text.tertiary, fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeError: { backgroundColor: '#7f1d1d' },
  badgeErrorText: { color: '#fecaca', fontSize: 11, fontWeight: '700' },
  badgeWarning: { backgroundColor: '#78350f' },
  badgeWarningText: { color: '#fde68a', fontSize: 11, fontWeight: '700' },
  statusText: { color: colors.text.tertiary, fontSize: 11, flex: 1 },
});
