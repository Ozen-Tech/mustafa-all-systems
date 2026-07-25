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

type Step = 'industries' | 'stores';

type Props = {
  allowSkip?: boolean;
  /** Quando true, abre direto na etapa de lojas (edição). */
  initialStep?: Step;
  onDone: () => void;
  onCancel?: () => void;
};

export default function GeneralOnboardingScreen({
  allowSkip = false,
  initialStep = 'industries',
  onDone,
  onCancel,
}: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [promoterState, setPromoterState] = useState<string | null>(null);

  const [selectedIndustryIds, setSelectedIndustryIds] = useState<Set<string>>(new Set());
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [storeSearch, setStoreSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [industries, onboarding] = await Promise.all([
        industryService.listIndustries(true),
        storeService.getOnboarding(),
      ]);
      setAllIndustries(industries);
      setAvailableStores(onboarding.availableStores || []);
      setPromoterState(onboarding.promoterState);
      setSelectedIndustryIds(new Set((onboarding.industries || []).map((i) => i.id)));
      setSelectedStoreIds(new Set((onboarding.stores || []).map((s) => s.id)));

      if (!allowSkip) {
        if (onboarding.needsIndustries) setStep('industries');
        else if (onboarding.needsStores) setStep('stores');
        else setStep(initialStep);
      } else {
        setStep(initialStep);
      }
    } catch (error: any) {
      console.error('[GeneralOnboarding] load error:', error);
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível carregar o onboarding.');
    } finally {
      setLoading(false);
    }
  }, [allowSkip, initialStep]);

  useEffect(() => {
    load();
  }, [load]);

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

  function toggleIndustry(id: string) {
    setSelectedIndustryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStore(id: string) {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveIndustriesAndContinue() {
    if (selectedIndustryIds.size === 0) {
      showAlert('Atenção', 'Selecione pelo menos uma indústria.');
      return;
    }
    setSaving(true);
    try {
      await industryService.setMyGeneralIndustries(Array.from(selectedIndustryIds));
      setStep('stores');
    } catch (error: any) {
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível salvar as indústrias.');
    } finally {
      setSaving(false);
    }
  }

  async function saveStoresAndFinish() {
    if (selectedStoreIds.size === 0) {
      showAlert('Atenção', 'Selecione pelo menos uma loja.');
      return;
    }
    setSaving(true);
    try {
      // Garante indústrias salvas também ao editar só lojas / voltar
      if (selectedIndustryIds.size > 0) {
        await industryService.setMyGeneralIndustries(Array.from(selectedIndustryIds));
      }
      await storeService.setMyRoute(Array.from(selectedStoreIds));
      onDone();
    } catch (error: any) {
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível salvar as lojas.');
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

  const isIndustries = step === 'industries';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>
          Passo {isIndustries ? '1' : '2'} de 2
        </Text>
        <Text style={styles.title}>
          {isIndustries ? 'Quais indústrias você trabalha?' : 'Quais lojas você faz?'}
        </Text>
        <Text style={styles.subtitle}>
          {isIndustries
            ? 'Marque as indústrias que você atende. Nas lojas, elas virão pré-selecionadas.'
            : promoterState
              ? `Escolha as lojas da sua rota (${promoterState}). Você pode buscar pelo nome.`
              : 'Escolha as lojas da sua rota. Você pode buscar pelo nome.'}
        </Text>
      </View>

      <ScrollView style={[screenContainer, flexScroll]} contentContainerStyle={styles.list}>
        {isIndustries ? (
          <>
            <TouchableOpacity
              style={styles.selectAll}
              onPress={() => {
                if (selectedIndustryIds.size === allIndustries.length) {
                  setSelectedIndustryIds(new Set());
                } else {
                  setSelectedIndustryIds(new Set(allIndustries.map((i) => i.id)));
                }
              }}
            >
              <Text style={styles.selectAllText}>
                {selectedIndustryIds.size === allIndustries.length
                  ? 'Limpar seleção'
                  : 'Selecionar todas'}
              </Text>
            </TouchableOpacity>

            {allIndustries.map((industry) => {
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
          </>
        ) : (
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
                const allSelected = ids.every((id) => selectedStoreIds.has(id));
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
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isIndustries ? (
          <Button
            variant="primary"
            size="lg"
            onPress={saveIndustriesAndContinue}
            disabled={selectedIndustryIds.size === 0 || saving}
            isLoading={saving}
            style={{ width: '100%' }}
          >
            Continuar ({selectedIndustryIds.size})
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              onPress={saveStoresAndFinish}
              disabled={selectedStoreIds.size === 0 || saving}
              isLoading={saving}
              style={{ width: '100%' }}
            >
              Confirmar lojas ({selectedStoreIds.size})
            </Button>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep('industries')}
              disabled={saving}
            >
              <Text style={styles.backText}>← Voltar para indústrias</Text>
            </TouchableOpacity>
          </>
        )}

        {allowSkip && onCancel ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>
            {isIndustries
              ? 'Selecione pelo menos uma indústria para continuar.'
              : 'Selecione pelo menos uma loja para finalizar.'}
          </Text>
        )}
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
