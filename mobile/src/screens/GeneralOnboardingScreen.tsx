import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { industryService, Industry } from '../services/industryService';
import { colors, theme } from '../styles/theme';
import { flexScroll, screenContainer } from '../styles/webLayout';
import Button from '../components/ui/Button';
import { showAlert } from '../utils/alertHelper';

type Props = {
  /** Quando true, permite pular só se já houver indústrias (modo edição no perfil). */
  allowSkip?: boolean;
  title?: string;
  subtitle?: string;
  onDone: (industries: Industry[]) => void;
  onCancel?: () => void;
};

export default function GeneralOnboardingScreen({
  allowSkip = false,
  title = 'Quais indústrias você trabalha?',
  subtitle = 'Marque as indústrias que você atende no dia a dia. Isso facilita o setup em cada loja — você só confirma na primeira visita.',
  onDone,
  onCancel,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, general] = await Promise.all([
        industryService.listIndustries(true),
        industryService.getGeneralOnboarding().catch(() => ({
          needsGeneralOnboarding: true,
          industries: [] as Industry[],
        })),
      ]);
      setIndustries(all);
      setSelectedIds(new Set(general.industries.map((i) => i.id)));
    } catch (error: any) {
      console.error('[GeneralOnboarding] load error:', error);
      showAlert('Erro', error?.response?.data?.message || 'Não foi possível carregar as indústrias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (selectedIds.size === 0) {
      showAlert('Atenção', 'Selecione pelo menos uma indústria.');
      return;
    }
    setSaving(true);
    try {
      const res = await industryService.setMyGeneralIndustries(Array.from(selectedIds));
      onDone(res.industries);
    } catch (error: any) {
      console.error('[GeneralOnboarding] save error:', error);
      showAlert(
        'Erro',
        error?.response?.data?.message || 'Não foi possível salvar. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary[400]} />
        <Text style={styles.loadingText}>Carregando indústrias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView style={[screenContainer, flexScroll]} contentContainerStyle={styles.list}>
        <TouchableOpacity
          style={styles.selectAll}
          onPress={() => {
            if (selectedIds.size === industries.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(industries.map((i) => i.id)));
            }
          }}
        >
          <Text style={styles.selectAllText}>
            {selectedIds.size === industries.length ? 'Limpar seleção' : 'Selecionar todas'}
          </Text>
        </TouchableOpacity>

        {industries.map((industry) => {
          const isSelected = selectedIds.has(industry.id);
          return (
            <TouchableOpacity
              key={industry.id}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => toggle(industry.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.industryName} numberOfLines={2}>
                  {industry.name}
                </Text>
                <Text style={styles.industryCode}>Cód. {industry.code}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {industries.length === 0 ? (
          <Text style={styles.empty}>Nenhuma indústria ativa cadastrada no sistema.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          onPress={confirm}
          disabled={selectedIds.size === 0 || saving}
          isLoading={saving}
          style={{ width: '100%' }}
        >
          Confirmar ({selectedIds.size})
        </Button>
        {allowSkip && onCancel ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>Selecione pelo menos uma indústria para continuar.</Text>
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
  selectAll: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  selectAllText: {
    color: colors.primary[400],
    fontWeight: '600',
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
  industryName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  industryCode: {
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
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  cancelText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
