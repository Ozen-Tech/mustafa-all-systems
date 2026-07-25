import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { industryService, Industry } from '../services/industryService';
import { storeService, Store } from '../services/storeService';
import { colors } from '../styles/theme';
import { flexScroll, screenContainer } from '../styles/webLayout';
import Button from '../components/ui/Button';
import { showAlert } from '../utils/alertHelper';

type Phase = 'stores' | 'store-industries';

type Props = {
  allowSkip?: boolean;
  onDone: () => void;
  onCancel?: () => void;
};

export default function GeneralOnboardingScreen({
  allowSkip = false,
  onDone,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<Phase>('stores');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [promoterState, setPromoterState] = useState<string | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [storeSearch, setStoreSearch] = useState('');

  /** Lojas na ordem em que o promotor vai configurar indústrias */
  const [queue, setQueue] = useState<Store[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [storeIndustryOptions, setStoreIndustryOptions] = useState<Industry[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<Set<string>>(new Set());
  const [existingByStore, setExistingByStore] = useState<Record<string, string[]>>({});
  const [loadingStoreIndustries, setLoadingStoreIndustries] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const onboarding = await storeService.getOnboarding();
      setAvailableStores(onboarding.availableStores || []);
      setPromoterState(onboarding.promoterState);
      setSelectedStoreIds(new Set((onboarding.stores || []).map((s) => s.id)));
      setExistingByStore(onboarding.industryIdsByStore || {});

      if (!allowSkip && onboarding.stores?.length && onboarding.storesPendingIndustries?.length) {
        // Já tem lojas, falta configurar indústrias em algumas
        setQueue(onboarding.storesPendingIndustries);
        setQueueIndex(0);
        setPhase('store-industries');
      } else {
        setPhase('stores');
      }
    } catch (error: any) {
      console.error('[GeneralOnboarding] load error:', error);
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível carregar o onboarding.');
    } finally {
      setLoading(false);
    }
  }, [allowSkip]);

  useEffect(() => {
    load();
  }, [load]);

  const currentStore = phase === 'store-industries' ? queue[queueIndex] : null;

  useEffect(() => {
    if (!currentStore) return;
    let cancelled = false;
    (async () => {
      setLoadingStoreIndustries(true);
      try {
        const industries = await industryService.getStoreIndustries(currentStore.id);
        if (cancelled) return;
        setStoreIndustryOptions(industries);
        const preexisting = existingByStore[currentStore.id] || [];
        setSelectedIndustryIds(
          new Set(preexisting.filter((id) => industries.some((i) => i.id === id)))
        );
      } catch (error: any) {
        if (!cancelled) {
          setStoreIndustryOptions([]);
          setSelectedIndustryIds(new Set());
          showAlert(
            'Atenção',
            error?.response?.data?.message ||
              `Não foi possível carregar indústrias de ${currentStore.name}.`
          );
        }
      } finally {
        if (!cancelled) setLoadingStoreIndustries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStore?.id, existingByStore]);

  const filteredStores = useMemo(() => {
    const term = storeSearch.trim().toLowerCase();
    if (!term) return availableStores;
    return availableStores.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.address || '').toLowerCase().includes(term) ||
        (s.code || '').toLowerCase().includes(term)
    );
  }, [availableStores, storeSearch]);

  function toggleStore(id: string) {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleIndustry(id: string) {
    setSelectedIndustryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveStoresAndContinue() {
    if (selectedStoreIds.size === 0) {
      showAlert('Atenção', 'Selecione pelo menos uma loja.');
      return;
    }
    setSaving(true);
    try {
      const { stores } = await storeService.setMyRoute(Array.from(selectedStoreIds));
      // Configura indústrias em todas as lojas selecionadas (na ordem da rota)
      setQueue(stores);
      setQueueIndex(0);
      setPhase('store-industries');
    } catch (error: any) {
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível salvar as lojas.');
    } finally {
      setSaving(false);
    }
  }

  async function saveStoreIndustriesAndContinue() {
    if (!currentStore) return;
    if (selectedIndustryIds.size === 0) {
      showAlert('Atenção', 'Selecione pelo menos uma indústria nesta loja.');
      return;
    }
    if (storeIndustryOptions.length === 0) {
      showAlert(
        'Loja sem indústrias',
        'Esta loja ainda não tem indústrias cadastradas no sistema. Peça ao admin para vincular e tente de novo, ou pule esta loja removendo-a da rota.'
      );
      return;
    }

    setSaving(true);
    try {
      await industryService.setMyStoreIndustries(
        currentStore.id,
        Array.from(selectedIndustryIds)
      );
      setExistingByStore((prev) => ({
        ...prev,
        [currentStore.id]: Array.from(selectedIndustryIds),
      }));

      if (queueIndex + 1 < queue.length) {
        setQueueIndex((i) => i + 1);
      } else {
        onDone();
      }
    } catch (error: any) {
      showAlert(
        'Erro',
        error?.response?.data?.message || 'Não foi possível salvar as indústrias desta loja.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const totalSteps = 1 + Math.max(queue.length, selectedStoreIds.size || 1);
  const currentStepNumber =
    phase === 'stores' ? 1 : 1 + queueIndex + 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>
          {phase === 'stores'
            ? 'Passo 1 · Lojas'
            : `Passo ${currentStepNumber} · Indústrias (${queueIndex + 1}/${queue.length})`}
        </Text>
        <Text style={styles.title}>
          {phase === 'stores'
            ? 'Quais lojas você faz?'
            : currentStore
              ? `Indústrias em ${currentStore.name}`
              : 'Indústrias da loja'}
        </Text>
        <Text style={styles.subtitle}>
          {phase === 'stores'
            ? promoterState
              ? `Escolha as lojas da sua rota (${promoterState}). Depois você marca as indústrias em cada uma.`
              : 'Escolha as lojas da sua rota. Depois você marca as indústrias em cada uma.'
            : 'Marque as indústrias que você atende nesta loja. Isso fica salvo para as próximas visitas.'}
        </Text>
      </View>

      <ScrollView style={[screenContainer, flexScroll]} contentContainerStyle={styles.list}>
        {phase === 'stores' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder="Buscar loja..."
              placeholderTextColor={colors.text.tertiary}
              value={storeSearch}
              onChangeText={setStoreSearch}
            />
            <TouchableOpacity
              style={styles.selectAll}
              onPress={() => {
                const ids = filteredStores.map((s) => s.id);
                const allSelected = ids.length > 0 && ids.every((id) => selectedStoreIds.has(id));
                if (allSelected) {
                  setSelectedStoreIds((prev) => {
                    const next = new Set(prev);
                    ids.forEach((id) => next.delete(id));
                    return next;
                  });
                } else {
                  setSelectedStoreIds((prev) => {
                    const next = new Set(prev);
                    ids.forEach((id) => next.add(id));
                    return next;
                  });
                }
              }}
            >
              <Text style={styles.selectAllText}>
                {filteredStores.length > 0 &&
                filteredStores.every((s) => selectedStoreIds.has(s.id))
                  ? 'Limpar filtradas'
                  : 'Selecionar filtradas'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.countHint}>
              {selectedStoreIds.size} loja(s) selecionada(s)
              {availableStores.length > 0 ? ` · ${availableStores.length} disponíveis` : ''}
            </Text>

            {filteredStores.map((store) => {
              const isSelected = selectedStoreIds.has(store.id);
              return (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => toggleStore(store.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {store.name}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={2}>
                      {[store.state, store.address].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filteredStores.length === 0 ? (
              <Text style={styles.empty}>
                Nenhuma loja encontrada
                {promoterState ? ` para o estado ${promoterState}` : ''}.
              </Text>
            ) : null}
          </>
        ) : loadingStoreIndustries ? (
          <View style={styles.centeredInline}>
            <ActivityIndicator color={colors.primary[400]} />
            <Text style={styles.loadingText}>Carregando indústrias da loja...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.selectAll}
              onPress={() => {
                if (selectedIndustryIds.size === storeIndustryOptions.length) {
                  setSelectedIndustryIds(new Set());
                } else {
                  setSelectedIndustryIds(new Set(storeIndustryOptions.map((i) => i.id)));
                }
              }}
            >
              <Text style={styles.selectAllText}>
                {selectedIndustryIds.size === storeIndustryOptions.length &&
                storeIndustryOptions.length > 0
                  ? 'Limpar seleção'
                  : 'Selecionar todas'}
              </Text>
            </TouchableOpacity>

            {storeIndustryOptions.map((industry) => {
              const isSelected = selectedIndustryIds.has(industry.id);
              return (
                <TouchableOpacity
                  key={industry.id}
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => toggleIndustry(industry.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {industry.name}
                    </Text>
                    <Text style={styles.itemMeta}>Cód. {industry.code}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {storeIndustryOptions.length === 0 ? (
              <Text style={styles.empty}>
                Esta loja não tem indústrias cadastradas. Peça ao admin para vincular indústrias à
                loja.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {phase === 'stores' ? (
          <Button
            variant="primary"
            size="lg"
            onPress={saveStoresAndContinue}
            disabled={selectedStoreIds.size === 0 || saving}
            isLoading={saving}
            style={{ width: '100%' }}
          >
            Continuar para indústrias ({selectedStoreIds.size})
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              onPress={saveStoreIndustriesAndContinue}
              disabled={
                saving ||
                loadingStoreIndustries ||
                (storeIndustryOptions.length > 0 && selectedIndustryIds.size === 0)
              }
              isLoading={saving}
              style={{ width: '100%' }}
            >
              {queueIndex + 1 < queue.length
                ? `Salvar e próxima loja (${queueIndex + 1}/${queue.length})`
                : `Finalizar (${queueIndex + 1}/${queue.length})`}
            </Button>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setPhase('stores')}
              disabled={saving}
            >
              <Text style={styles.backText}>← Voltar para lojas</Text>
            </TouchableOpacity>
          </>
        )}

        {allowSkip && onCancel ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>
            {phase === 'stores'
              ? 'Selecione pelo menos uma loja para continuar.'
              : 'Selecione as indústrias desta loja para seguir.'}
          </Text>
        )}
        {phase === 'store-industries' ? (
          <Text style={styles.progressHint}>
            Total estimado de etapas: {totalSteps} · etapa atual {currentStepNumber}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredInline: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.text.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  stepLabel: {
    color: colors.primary[400],
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  search: {
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
    marginBottom: 10,
  },
  selectAll: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  selectAllText: {
    color: colors.primary[400],
    fontWeight: '600',
  },
  countHint: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  rowSelected: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[600],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.dark.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
  },
  itemName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemMeta: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  empty: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
  },
  progressHint: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 11,
  },
  backBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 8,
    alignItems: 'center',
    padding: 8,
  },
  cancelText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
