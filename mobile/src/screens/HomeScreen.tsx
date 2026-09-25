import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
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
import LoadingView from '../components/ui/LoadingView';
import Badge from '../components/ui/Badge';
import {
  dayBoardService,
  DayBoard,
  DayBoardIndicator,
  TrailStatus,
} from '../services/dayBoardService';

type HomeNavigation = NavigationProp<Record<string, object | undefined>>;

function statusLabel(status: TrailStatus): string {
  if (status === 'done') return 'Feita';
  if (status === 'skipped') return 'Não feita';
  if (status === 'active') return 'Agora';
  return 'Pendente';
}

function statusDotColor(status: TrailStatus): string {
  if (status === 'done') return colors.success;
  if (status === 'skipped') return colors.text.tertiary;
  if (status === 'active') return colors.accent[400];
  return colors.primary[500];
}

function IndicatorChip({ item }: { item: DayBoardIndicator }) {
  return (
    <View style={[styles.indicatorChip, item.complete && styles.indicatorChipDone]}>
      <Text style={[styles.indicatorValue, item.complete && styles.indicatorValueDone]}>
        {item.total <= 1 ? (item.complete ? 'OK' : '—') : `${item.done}/${item.total}`}
      </Text>
      <Text style={styles.indicatorLabel}>{item.label}</Text>
    </View>
  );
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
  const [board, setBoard] = useState<DayBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);

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
      setHasActiveVisit(isActiveVisitRef.current);
    } finally {
      setLoading(false);
    }
  }, [clearVisit, syncFromServerCurrentVisit]);

  const loadDayBoard = useCallback(async () => {
    try {
      setBoardLoading(true);
      const data = await dayBoardService.getDayBoard();
      setBoard(data);
    } catch (error: any) {
      console.warn('[HomeScreen] Erro ao carregar quadro do dia:', error?.message || error);
      setBoard(null);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visitFlowLoading) return;
    checkActiveVisit();
    loadDayBoard();
    offlineSyncService.syncAll().catch(() => {});

    const unsubscribe = navigation.addListener('focus', () => {
      if (visitFlowLoading) return;
      checkActiveVisit();
      loadDayBoard();
      offlineSyncService.syncAll().catch(() => {});
    });

    return unsubscribe;
  }, [navigation, visitFlowLoading, checkActiveVisit, loadDayBoard]);

  function handlePrimaryAction() {
    if (!board) {
      navigation.navigate(hasActiveVisit ? 'ActiveVisit' : 'Stores');
      return;
    }
    const action = board.nextAction;
    if (action.type === 'continue_visit') {
      navigation.navigate('ActiveVisit');
      return;
    }
    if (action.type === 'go_store' || action.type === 'no_route') {
      navigation.navigate('Stores');
      return;
    }
    if (action.type === 'day_absence') {
      navigation.navigate('JustifyAbsence');
      return;
    }
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
  const ringPercent = board?.ring.percent ?? 0;
  const dayClosed = board?.nextAction.type === 'day_closed';

  return (
    <ScrollView style={[screenStyles.root, flexScroll]} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={todayLabel}
        title={`Olá, ${firstName}`}
        subtitle="Feche sua rota loja a loja — visite ou marque o que não for fazer"
      />

      <Card style={styles.ringCard} shadow>
        {boardLoading && !board ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Montando o quadro do dia...</Text>
          </View>
        ) : (
          <>
            <View style={styles.ringRow}>
              <View style={styles.ringOuter}>
                <View
                  style={[
                    styles.ringFill,
                    {
                      borderColor:
                        ringPercent >= 100
                          ? colors.success
                          : ringPercent > 0
                            ? colors.primary[400]
                            : colors.dark.border,
                    },
                  ]}
                >
                  <Text style={styles.ringPercent}>{ringPercent}%</Text>
                  <Text style={styles.ringSub}>
                    {board ? `${board.ring.resolved}/${board.ring.total}` : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.ringMeta}>
                <Text style={styles.pointsValue}>
                  {board?.points ?? 0}
                  <Text style={styles.pointsMax}> / {board?.pointsMax ?? 0}</Text>
                </Text>
                <Text style={styles.pointsLabel}>pontos de hoje</Text>
                <View style={styles.streakRow}>
                  <Badge variant={board && board.streakDays > 0 ? 'accent' : 'gray'} size="sm">
                    {board && board.streakDays > 0
                      ? `${board.streakDays} dia${board.streakDays === 1 ? '' : 's'} seguidos`
                      : 'Sequência zerada'}
                  </Badge>
                </View>
              </View>
            </View>

            {board ? (
              <View style={styles.indicatorsRow}>
                <IndicatorChip item={board.indicators.stores} />
                <IndicatorChip item={board.indicators.industries} />
                <IndicatorChip item={board.indicators.onTime} />
                {board.indicators.photos ? <IndicatorChip item={board.indicators.photos} /> : null}
              </View>
            ) : null}
          </>
        )}
      </Card>

      <Section title="Próxima ação">
        {hasActiveVisit && localVisit ? (
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
        <Button
          variant={dayClosed ? 'outline' : hasActiveVisit ? 'accent' : 'primary'}
          size="lg"
          onPress={handlePrimaryAction}
          disabled={dayClosed}
          style={styles.fullWidth}
        >
          {board?.nextAction.label || (hasActiveVisit ? 'Continuar visita' : 'Iniciar visita')}
        </Button>
      </Section>

      <Section title="Trilha da rota">
        {boardLoading && !board ? (
          <Card style={styles.loadingBlock} shadow>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </Card>
        ) : board && board.trail.length > 0 ? (
          <Card shadow style={styles.trailCard}>
            {board.trail.map((item, index) => (
              <Pressable
                key={item.storeId}
                style={[styles.trailItem, index > 0 && styles.trailItemBorder]}
                onPress={() => {
                  if (item.status === 'active') navigation.navigate('ActiveVisit');
                  else if (item.status === 'pending' || item.status === 'skipped') {
                    navigation.navigate('Stores');
                  }
                }}
              >
                <View style={[styles.trailDot, { backgroundColor: statusDotColor(item.status) }]} />
                <View style={styles.trailCopy}>
                  <Text style={styles.trailName} numberOfLines={1}>
                    {item.storeName}
                  </Text>
                  <Text style={styles.trailMeta} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <Badge
                  variant={
                    item.status === 'done'
                      ? 'success'
                      : item.status === 'active'
                        ? 'accent'
                        : item.status === 'skipped'
                          ? 'gray'
                          : 'primary'
                  }
                  size="sm"
                >
                  {statusLabel(item.status)}
                </Badge>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card shadow>
            <Text style={styles.emptySummary}>
              Nenhuma loja na rota. Configure suas lojas para jogar o dia.
            </Text>
            <Button
              variant="outline"
              size="md"
              onPress={() => navigation.navigate('Stores')}
              style={[styles.fullWidth, { marginTop: theme.spacing.md }]}
            >
              Ver lojas
            </Button>
          </Card>
        )}
      </Section>

      <Section title="Mais">
        <Button
          variant="outline"
          size="md"
          onPress={() => navigation.navigate('JustifyAbsence')}
          style={styles.fullWidth}
        >
          {board?.hasDayAbsence ? 'Ver / atualizar falta do dia' : 'Justificar falta / atestado'}
        </Button>
        <Button
          variant="outline"
          size="md"
          onPress={() => navigation.navigate('Goals')}
          style={[styles.fullWidth, { marginTop: theme.spacing.sm }]}
        >
          Ver minhas metas
        </Button>
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
  ringCard: {
    padding: theme.spacing.lg,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  ringOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.cardElevated,
  },
  ringPercent: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  ringSub: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  ringMeta: {
    flex: 1,
  },
  pointsValue: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[300],
  },
  pointsMax: {
    fontSize: theme.typography.fontSize.lg,
    color: colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pointsLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  streakRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
  },
  indicatorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  indicatorChip: {
    flexGrow: 1,
    minWidth: '22%',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardElevated,
    alignItems: 'center',
  },
  indicatorChipDone: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  indicatorValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  indicatorValueDone: {
    color: colors.success,
  },
  indicatorLabel: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
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
  trailCard: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: 0,
  },
  trailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  trailItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  trailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trailCopy: {
    flex: 1,
    minWidth: 0,
  },
  trailName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  trailMeta: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  loadingBlock: {
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
