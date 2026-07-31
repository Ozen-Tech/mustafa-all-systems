import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { visitService } from '../services/visitService';
import { useVisitFlow } from '../features/visits';
import { offlineSyncService } from '../services/offlineSyncService';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import { layout, screenStyles } from '../styles/layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Section from '../components/ui/Section';
import MetricCard from '../components/ui/MetricCard';
import LoadingView from '../components/ui/LoadingView';
import Badge from '../components/ui/Badge';
import { dayAbsenceService } from '../services/dayAbsenceService';

type HomeNavigation = NavigationProp<Record<string, object | undefined>>;

interface DailySummary {
  totalVisits: number;
  totalHours: number;
  completedVisits: number;
  inProgressVisits: number;
  totalPhotos: number;
  photoGoal: number;
  photoCompliance: number;
  status: 'conforme' | 'atencao' | 'fora_meta';
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { user } = useAuth();
  const {
    visit: localVisit,
    isActiveVisit,
    loading: visitFlowLoading,
    pendingPhotosCount,
    pendingSurveysCount,
    clearVisit,
    syncFromServerCurrentVisit,
  } = useVisitFlow();
  const isActiveVisitRef = useRef(isActiveVisit);
  useEffect(() => {
    isActiveVisitRef.current = isActiveVisit;
  }, [isActiveVisit]);

  const [hasActiveVisit, setHasActiveVisit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [hasDayAbsence, setHasDayAbsence] = useState(false);

  const checkActiveVisit = useCallback(async () => {
    try {
      setLoading(true);
      const response = await visitService.getCurrentVisit();
      if (response.visit) {
        setHasActiveVisit(true);
        await syncFromServerCurrentVisit(response.visit);
      } else {
        setHasActiveVisit(false);
        try {
          await clearVisit();
        } catch (_) {}
      }
    } catch (error: any) {
      console.warn('[HomeScreen] Erro ao verificar visita ativa:', error?.message || error);
      // Erro de rede ou servidor: não apagar estado local nem forçar "sem visita"
      setHasActiveVisit(isActiveVisitRef.current);
    } finally {
      setLoading(false);
    }
  }, [clearVisit, syncFromServerCurrentVisit]);

  useEffect(() => {
    if (visitFlowLoading) return;
    checkActiveVisit();
    loadDailySummary();
    loadDayAbsence();
    offlineSyncService.syncAll().catch(() => {});

    const unsubscribe = navigation.addListener('focus', () => {
      if (visitFlowLoading) return;
      checkActiveVisit();
      loadDailySummary();
      loadDayAbsence();
      offlineSyncService.syncAll().catch(() => {});
    });

    return unsubscribe;
  }, [navigation, visitFlowLoading, checkActiveVisit]);

  async function loadDailySummary() {
    try {
      setSummaryLoading(true);
      const summary = await visitService.getDailySummary();
      setDailySummary(summary);
    } catch (error: any) {
      console.warn('⚠️ Erro ao carregar resumo do dia:', error?.message || error);
      // Não definir erro crítico, apenas não mostrar resumo
      setDailySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadDayAbsence() {
    try {
      const { absence } = await dayAbsenceService.getToday();
      setHasDayAbsence(!!absence);
    } catch {
      setHasDayAbsence(false);
    }
  }

  function handleStartVisit() {
    navigation.navigate('Stores');
  }

  function handleContinueVisit() {
    navigation.navigate('ActiveVisit');
  }

  function handleJustifyAbsence() {
    navigation.navigate('JustifyAbsence');
  }

  if (visitFlowLoading || loading || hasActiveVisit === null) {
    return <LoadingView message="Preparando seu painel..." />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Promotor';
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView style={[screenStyles.root, flexScroll]} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={todayLabel}
        title={`Olá, ${firstName}`}
        subtitle="Acompanhe sua visita e o desempenho do dia"
      />

      <Card style={styles.statusCard} variant={hasActiveVisit ? 'primary' : 'default'} shadow>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, hasActiveVisit && styles.statusDotActive]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              {hasActiveVisit ? 'Visita em andamento' : 'Pronto para começar'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {hasActiveVisit
                ? 'Continue de onde parou ou finalize para iniciar outra loja'
                : 'Selecione uma loja da sua rota para iniciar o check-in'}
            </Text>
          </View>
        </View>
      </Card>

      <Section title="Ação principal">
        {hasActiveVisit ? (
          <>
            {localVisit ? (
              <Card style={styles.visitCard} shadow>
                <View style={styles.visitCardHeader}>
                  <Text style={styles.visitStore}>{localVisit.storeName}</Text>
                  <Badge variant="accent" size="sm">
                    Ativa
                  </Badge>
                </View>
                <Text style={styles.visitStatus}>
                  {localVisit.status === 'checkedIn' || localVisit.status === 'working'
                    ? 'Trabalhando na loja'
                    : localVisit.status === 'storeCompleted'
                      ? 'Aguardando checkout'
                      : 'Visita em progresso'}
                </Text>
                {(pendingPhotosCount > 0 || pendingSurveysCount > 0) && (
                  <Text style={styles.pendingSync}>
                    {pendingPhotosCount} foto(s) · {pendingSurveysCount} pesquisa(s) pendentes
                  </Text>
                )}
              </Card>
            ) : null}
            <Button variant="accent" size="lg" onPress={handleContinueVisit} style={styles.fullWidth}>
              Continuar visita
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" onPress={handleStartVisit} style={styles.fullWidth}>
            Iniciar nova visita
          </Button>
        )}
      </Section>

      <Section title="Ausência / atestado">
        {hasDayAbsence ? (
          <Card style={styles.absenceCard} shadow>
            <View style={styles.visitCardHeader}>
              <Text style={styles.absenceTitle}>Falta justificada hoje</Text>
              <Badge variant="warning" size="sm">
                Registrada
              </Badge>
            </View>
            <Text style={styles.absenceSubtitle}>
              Você já enviou atestado ou justificativa para este dia. Toque para atualizar.
            </Text>
          </Card>
        ) : (
          <Text style={styles.absenceSubtitle}>
            Não vai trabalhar hoje? Registre a falta e anexe o atestado ou comprovante.
          </Text>
        )}
        <Button
          variant="outline"
          size="lg"
          onPress={handleJustifyAbsence}
          style={[styles.fullWidth, { marginTop: theme.spacing.md }]}
        >
          {hasDayAbsence ? 'Ver / atualizar justificativa' : 'Justificar falta / atestado'}
        </Button>
      </Section>

      <Section title="Resumo do dia">
        {summaryLoading ? (
          <Card style={styles.loadingCard} shadow>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Atualizando métricas...</Text>
          </Card>
        ) : dailySummary ? (
          <Card shadow>
            <View style={styles.metricsGrid}>
              <MetricCard label="Visitas" value={String(dailySummary.totalVisits)} accent="primary" />
              <MetricCard
                label="Horas"
                value={`${dailySummary.totalHours.toFixed(1)}h`}
                accent="default"
              />
              <MetricCard label="Fotos" value={String(dailySummary.totalPhotos)} accent="accent" />
              <MetricCard
                label="Meta fotos"
                value={`${dailySummary.photoCompliance.toFixed(0)}%`}
                accent="success"
              />
            </View>
            {dailySummary.inProgressVisits > 0 ? (
              <View style={styles.inlineBadge}>
                <Text style={styles.inlineBadgeText}>
                  {dailySummary.inProgressVisits} visita(s) em andamento
                </Text>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card shadow>
            <Text style={styles.emptySummary}>Sem dados do dia ainda. Inicie uma visita para começar.</Text>
          </Card>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.lg,
    paddingBottom: layout.screenPaddingBottom,
    gap: layout.sectionGap,
  },
  statusCard: {
    padding: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
    marginTop: 6,
    backgroundColor: colors.text.tertiary,
  },
  statusDotActive: {
    backgroundColor: colors.primary[400],
    ...theme.shadows.primary,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statusSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
  },
  absenceCard: {
    marginBottom: theme.spacing.sm,
  },
  absenceTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  absenceSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  visitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  visitStore: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  visitStatus: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary[400],
    fontWeight: theme.typography.fontWeight.medium,
  },
  pendingSync: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: colors.warning,
    fontWeight: theme.typography.fontWeight.medium,
  },
  fullWidth: {
    width: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  inlineBadge: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
  },
  inlineBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary[300],
    fontWeight: theme.typography.fontWeight.medium,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  emptySummary: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

