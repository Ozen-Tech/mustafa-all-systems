import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { visitService, PriceResearchSuggestion } from '../services/visitService';
import { offlineSyncService } from '../services/offlineSyncService';
import { addSurvey, getSurveys } from '../features/visits';
import type { LocalPriceSurvey, SyncStatus } from '../features/visits';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type PriceResearchNavigation = NavigationProp<Record<string, object | undefined>>;

interface CompetitorRow {
  name: string;
  priceDigits: string;
}

interface SessionItem {
  localId: string;
  productName: string;
  price: number;
  competitorPrices: Array<{ competitorName: string; price: number }>;
}

/** "1290" → 12.9 (digitação em centavos, como maquininha). */
function digitsToValue(digits: string): number {
  const n = parseInt(digits || '0', 10);
  return Number.isFinite(n) ? n / 100 : 0;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onlyDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 8);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function newLocalId(): string {
  return `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function PriceInput({
  digits,
  onChange,
  placeholder,
  large,
  inputRef,
  onSubmit,
}: {
  digits: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  large?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmit?: () => void;
}) {
  return (
    <View style={[styles.priceBox, large && styles.priceBoxLarge]}>
      <Text style={[styles.pricePrefix, large && styles.pricePrefixLarge]}>R$</Text>
      <TextInput
        ref={inputRef}
        style={[styles.priceInput, large && styles.priceInputLarge]}
        value={digits ? formatBRL(digitsToValue(digits)) : ''}
        onChangeText={(t) => onChange(onlyDigits(t))}
        placeholder={placeholder ?? '0,00'}
        placeholderTextColor={colors.gray[500]}
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

export default function PriceResearchScreen({ route }: any) {
  const navigation = useNavigation<PriceResearchNavigation>();
  const { visit } = route.params || {};
  const visitId: string | undefined = visit?.id;
  const storeId: string | undefined = visit?.store?.id;

  const [productName, setProductName] = useState('');
  const [priceDigits, setPriceDigits] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [products, setProducts] = useState<PriceResearchSuggestion[]>([]);
  const [competitorNames, setCompetitorNames] = useState<string[]>([]);
  const [productFocused, setProductFocused] = useState(false);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [statusById, setStatusById] = useState<Record<string, SyncStatus>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!storeId) return;
    visitService
      .getPriceResearchSuggestions(storeId)
      .then((data) => {
        setProducts(data.products);
        setCompetitorNames(data.competitors);
      })
      .catch(() => {});
  }, [storeId]);

  const refreshStatuses = useCallback(async () => {
    if (!visitId) return;
    const stored = await getSurveys(visitId);
    const map: Record<string, SyncStatus> = {};
    for (const s of stored) map[s.localId] = s.syncStatus;
    setStatusById(map);
    return stored;
  }, [visitId]);

  useEffect(() => {
    const unsubscribe = offlineSyncService.addListener((event) => {
      if (event.type === 'surveySynced' || event.type === 'complete' || event.type === 'error') {
        void refreshStatuses().then((stored) => {
          if (event.type !== 'complete' || !stored) return;
          if (stored.some((s) => s.syncStatus === 'pending')) {
            setTimeout(() => offlineSyncService.syncAll().catch(() => {}), 1500);
          }
        });
      }
    });
    return () => {
      unsubscribe();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [refreshStatuses]);

  const productMatches = useMemo(() => {
    const q = normalize(productName);
    if (!q) return products.filter((p) => p.lastPrice != null).slice(0, 8);
    const exact = products.find((p) => normalize(p.name) === q);
    if (exact) return [];
    const terms = q.split(/\s+/);
    return products.filter((p) => {
      const n = normalize(p.name);
      return terms.every((t) => n.includes(t));
    }).slice(0, 6);
  }, [productName, products]);

  const selectedSuggestion = useMemo(
    () => products.find((p) => normalize(p.name) === normalize(productName)) || null,
    [productName, products]
  );

  const price = digitsToValue(priceDigits);
  const validCompetitors = competitors
    .map((c) => ({ competitorName: c.name.trim(), price: digitsToValue(c.priceDigits) }))
    .filter((c) => c.competitorName && c.price > 0);
  const avgCompetitor =
    validCompetitors.length > 0
      ? validCompetitors.reduce((sum, c) => sum + c.price, 0) / validCompetitors.length
      : 0;
  const canSave = !!productName.trim() && price > 0 && !saving;

  function pickProduct(p: PriceResearchSuggestion) {
    setProductName(p.name);
    setProductFocused(false);
    setTimeout(() => priceRef.current?.focus(), 50);
  }

  function updateCompetitor(index: number, patch: Partial<CompetitorRow>) {
    setCompetitors((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function showFeedback(message: string) {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  }

  async function save() {
    if (!canSave) return;
    if (!visitId || !storeId) {
      setError('Visita não encontrada. Volte e abra a pesquisa pela visita ativa.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const survey: LocalPriceSurvey = {
        localId: newLocalId(),
        visitId,
        storeId,
        industryId: null,
        productName: productName.trim(),
        price,
        competitorPrices: validCompetitors,
        syncStatus: 'pending',
        syncedAt: null,
        deviceCreatedAt: new Date().toISOString(),
        errorMessage: null,
      };
      await addSurvey(visitId, survey);

      setSessionItems((items) => [
        {
          localId: survey.localId,
          productName: survey.productName,
          price: survey.price,
          competitorPrices: survey.competitorPrices,
        },
        ...items,
      ]);
      setStatusById((m) => ({ ...m, [survey.localId]: 'pending' }));

      const key = normalize(survey.productName);
      setProducts((list) => {
        const rest = list.filter((p) => normalize(p.name) !== key);
        return [
          { name: survey.productName, lastPrice: survey.price, lastAt: survey.deviceCreatedAt, industry: null },
          ...rest,
        ];
      });
      for (const c of survey.competitorPrices) {
        setCompetitorNames((names) =>
          names.some((n) => normalize(n) === normalize(c.competitorName)) ? names : [c.competitorName, ...names]
        );
      }

      setProductName('');
      setPriceDigits('');
      setCompetitors((rows) => rows.map((r) => ({ name: r.name, priceDigits: '' })));
      showFeedback(`✓ ${survey.productName} salvo`);
      setTimeout(() => productRef.current?.focus(), 50);

      offlineSyncService.syncAll().catch(() => {});
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar a pesquisa.');
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(localId: string): { text: string; color: string } {
    const status = statusById[localId];
    if (status === 'pending' || status === 'uploading') return { text: 'Enviando…', color: colors.warning };
    if (status === 'error') return { text: 'Sem conexão · tenta de novo', color: colors.error };
    return { text: 'Enviado', color: colors.success };
  }

  const showSuggestions = productFocused && productMatches.length > 0;

  return (
    <ScrollView
      style={[styles.container, flexScroll]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Pesquisa de preço</Text>
        {visit?.store?.name ? <Text style={styles.storeName}>{visit.store.name}</Text> : null}
        <Text style={styles.hint}>
          Escolha o produto, digite o preço e toque em Salvar. Funciona sem internet: envia sozinho quando conectar.
        </Text>
      </View>

      <Card style={styles.formCard} shadow>
        <Text style={styles.label}>Produto</Text>
        <TextInput
          ref={productRef}
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          onFocus={() => setProductFocused(true)}
          onBlur={() => setTimeout(() => setProductFocused(false), 150)}
          placeholder="Digite ou escolha abaixo"
          placeholderTextColor={colors.gray[500]}
          returnKeyType="next"
          onSubmitEditing={() => priceRef.current?.focus()}
          autoCapitalize="characters"
        />

        {showSuggestions && (
          <View style={styles.suggestions}>
            {!productName.trim() && <Text style={styles.suggestionsTitle}>Já pesquisados nesta loja</Text>}
            {productMatches.map((p) => (
              <Pressable
                key={p.name}
                onPress={() => pickProduct(p)}
                style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
              >
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {p.name}
                </Text>
                {p.lastPrice != null ? (
                  <Text style={styles.suggestionMeta}>último R$ {formatBRL(p.lastPrice)}</Text>
                ) : p.industry ? (
                  <Text style={styles.suggestionMeta}>{p.industry}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.priceHeader}>
          <Text style={styles.label}>Preço na gôndola</Text>
          {selectedSuggestion?.lastPrice != null && (
            <Pressable
              onPress={() => setPriceDigits(String(Math.round((selectedSuggestion.lastPrice || 0) * 100)))}
              hitSlop={8}
            >
              <Text style={styles.reuse}>Usar último: R$ {formatBRL(selectedSuggestion.lastPrice)}</Text>
            </Pressable>
          )}
        </View>
        <PriceInput digits={priceDigits} onChange={setPriceDigits} large inputRef={priceRef} onSubmit={save} />
      </Card>

      <Card style={styles.formCard} shadow>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Concorrentes</Text>
          <Text style={styles.optional}>opcional</Text>
        </View>

        {competitors.map((c, i) => (
          <View key={i} style={styles.competitorRow}>
            <TextInput
              style={[styles.input, styles.competitorName]}
              value={c.name}
              onChangeText={(t) => updateCompetitor(i, { name: t })}
              placeholder="Concorrente"
              placeholderTextColor={colors.gray[500]}
              autoCapitalize="characters"
            />
            <View style={styles.competitorPrice}>
              <PriceInput digits={c.priceDigits} onChange={(d) => updateCompetitor(i, { priceDigits: d })} />
            </View>
            <Pressable
              onPress={() => setCompetitors((rows) => rows.filter((_, idx) => idx !== i))}
              hitSlop={8}
              style={styles.removeBtn}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.chips}>
          {competitorNames
            .filter((n) => !competitors.some((c) => normalize(c.name) === normalize(n)))
            .slice(0, 6)
            .map((n) => (
              <Pressable
                key={n}
                onPress={() => setCompetitors((rows) => [...rows, { name: n, priceDigits: '' }])}
                style={styles.chip}
              >
                <Text style={styles.chipText}>+ {n}</Text>
              </Pressable>
            ))}
          <Pressable
            onPress={() => setCompetitors((rows) => [...rows, { name: '', priceDigits: '' }])}
            style={[styles.chip, styles.chipOutline]}
          >
            <Text style={styles.chipText}>+ Outro</Text>
          </Pressable>
        </View>

        {price > 0 && avgCompetitor > 0 && (
          <View style={styles.compare}>
            <Text style={styles.compareText}>
              {price > avgCompetitor
                ? `R$ ${formatBRL(price - avgCompetitor)} mais caro que a média dos concorrentes`
                : price < avgCompetitor
                  ? `R$ ${formatBRL(avgCompetitor - price)} mais barato que a média dos concorrentes`
                  : 'Mesmo preço da média dos concorrentes'}
            </Text>
          </View>
        )}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <Button variant="primary" size="lg" onPress={save} isLoading={saving} disabled={!canSave} style={styles.fullWidth}>
        Salvar e próximo
      </Button>
      <Button variant="outline" size="md" onPress={() => navigation.goBack()} style={styles.doneButton}>
        {sessionItems.length > 0 ? `Concluir (${sessionItems.length})` : 'Voltar'}
      </Button>

      {sessionItems.length > 0 && (
        <View style={styles.sessionList}>
          <Text style={styles.sectionTitle}>Registrados agora</Text>
          {sessionItems.map((item) => {
            const st = statusLabel(item.localId);
            return (
              <View key={item.localId} style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.sessionStatus, { color: st.color }]}>{st.text}</Text>
                </View>
                <Text style={styles.sessionPrice}>R$ {formatBRL(item.price)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  storeName: {
    fontSize: theme.typography.fontSize.base,
    color: colors.accent[400],
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: 2,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  formCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.dark.backgroundSecondary,
  },
  suggestions: {
    marginTop: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardElevated,
    overflow: 'hidden',
  },
  suggestionsTitle: {
    fontSize: 11,
    color: colors.text.tertiary,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  suggestionRowPressed: {
    backgroundColor: colors.dark.border,
  },
  suggestionName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  suggestionMeta: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  reuse: {
    color: colors.primary[400],
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
  },
  priceBoxLarge: {
    borderColor: colors.primary[600],
    paddingHorizontal: theme.spacing.md,
  },
  pricePrefix: {
    color: colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    marginRight: 4,
  },
  pricePrefixLarge: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    minWidth: 0,
  },
  priceInputLarge: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold,
    paddingVertical: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  optional: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  competitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  competitorName: {
    flex: 1.3,
  },
  competitorPrice: {
    flex: 1,
  },
  removeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  removeText: {
    color: colors.text.tertiary,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.primary[600] + '26',
    borderWidth: 1,
    borderColor: colors.primary[600] + '80',
  },
  chipOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.dark.borderLight,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  compare: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.dark.cardElevated,
  },
  compareText: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  feedback: {
    color: colors.success,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  fullWidth: {
    width: '100%',
  },
  doneButton: {
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  sessionList: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sessionStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionPrice: {
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
