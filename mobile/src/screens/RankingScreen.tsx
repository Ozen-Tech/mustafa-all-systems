import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, theme } from '../styles/theme';
import { flexScroll, screenContainer } from '../styles/webLayout';
import { screenStyles } from '../styles/layout';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Badge from '../components/ui/Badge';
import LoadingView from '../components/ui/LoadingView';
import EmptyState from '../components/ui/EmptyState';
import { dayBoardService, RankingEntry, WeeklyRanking } from '../services/dayBoardService';

function formatWeekLabel(start: string, end: string): string {
  try {
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(start)} — ${fmt(end)}`;
  } catch {
    return `${start} — ${end}`;
  }
}

function medalForRank(rank: number): string {
  if (rank === 1) return '1º';
  if (rank === 2) return '2º';
  if (rank === 3) return '3º';
  return `${rank}º`;
}

export default function RankingScreen() {
  const [ranking, setRanking] = useState<WeeklyRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await dayBoardService.getRanking();
      setRanking(data);
    } catch (error) {
      console.warn('[RankingScreen] Falha ao carregar ranking:', error);
      setRanking(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !ranking) {
    return <LoadingView message="Carregando ranking da semana..." />;
  }

  const scopeLabel =
    ranking?.scope === 'supervisor_team'
      ? 'Sua equipe (mesmo supervisor)'
      : ranking?.scope === 'state'
        ? 'Promotores do seu estado'
        : 'Ranking';

  return (
    <View style={[screenStyles.root, screenContainer]}>
      <View style={screenStyles.headerBand}>
        <ScreenHeader
          title="Ranking da semana"
          subtitle={
            ranking
              ? `${scopeLabel} · ${formatWeekLabel(ranking.weekStart, ranking.weekEnd)}`
              : 'Competição semanal por pontos do quadro do dia'
          }
        />
        {ranking ? (
          <Card style={styles.meCard} shadow>
            <Text style={styles.meRank}>
              {ranking.myRank != null ? `#${ranking.myRank}` : '—'}
            </Text>
            <View style={styles.meMeta}>
              <Text style={styles.mePoints}>{ranking.myPoints} pts</Text>
              <Text style={styles.meHint}>
                {ranking.totalPlayers} promotor{ranking.totalPlayers === 1 ? '' : 'es'} no ranking
              </Text>
            </View>
          </Card>
        ) : null}
      </View>

      <FlatList
        style={flexScroll}
        data={ranking?.entries || []}
        keyExtractor={(item) => item.promoterId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary[400]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary[400]} />
          ) : (
            <EmptyState
              icon="🏆"
              title="Sem ranking ainda"
              description="Assim que sua equipe pontuar no quadro do dia, a classificação aparece aqui."
            />
          )
        }
        renderItem={({ item }: { item: RankingEntry }) => (
          <Card
            style={[styles.row, item.isMe && styles.rowMe, item.rank <= 3 && styles.rowTop]}
            shadow={item.isMe}
          >
            <Text style={[styles.rankNum, item.rank <= 3 && styles.rankNumTop]}>
              {medalForRank(item.rank)}
            </Text>
            <View style={styles.rowBody}>
              <View style={styles.rowTitle}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isMe ? (
                  <Badge variant="accent" size="sm">
                    Você
                  </Badge>
                ) : null}
              </View>
              <Text style={styles.rowSub}>
                {item.streakDays > 0
                  ? `${item.streakDays} dia${item.streakDays === 1 ? '' : 's'} em sequência`
                  : 'Sem sequência ativa'}
              </Text>
            </View>
            <Text style={styles.points}>{item.points}</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  meRank: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[400],
    minWidth: 56,
  },
  meMeta: {
    flex: 1,
  },
  mePoints: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  meHint: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowMe: {
    borderColor: colors.primary[500],
    borderWidth: 1.5,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  rowTop: {
    borderColor: colors.dark.borderLight,
  },
  rankNum: {
    width: 40,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  rankNumTop: {
    color: colors.accent[400],
    fontSize: theme.typography.fontSize.lg,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  rowSub: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  points: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    minWidth: 40,
    textAlign: 'right',
  },
});
