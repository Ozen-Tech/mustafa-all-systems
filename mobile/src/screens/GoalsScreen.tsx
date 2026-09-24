import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingView from '../components/ui/LoadingView';
import {
  formatGoalValue,
  goalService,
  PromoterGoalRow,
} from '../services/goalService';

export default function GoalsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('');
  const [rows, setRows] = useState<PromoterGoalRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await goalService.getMyGoals();
      setPeriod(data.period);
      setRows(data.rows);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao carregar metas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingView message="Carregando metas..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={flexScroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary[500]}
          />
        }
      >
        <ScreenHeader
          title="Minhas metas"
          subtitle={`Comerciais do mês ${period || '—'} (somente leitura)`}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!rows.length && !error ? (
          <Card style={styles.emptyCard} shadow>
            <Text style={styles.emptyText}>
              Nenhuma meta vinculada às suas indústrias ou lojas neste período.
            </Text>
          </Card>
        ) : (
          rows.map((row) => {
            const scope =
              [row.goal.industry?.name, row.goal.chain?.name, row.goal.store?.name]
                .filter(Boolean)
                .join(' · ') || 'Geral';
            const pct = Math.min(Math.max(row.pct, 0), 100);
            const onTrack = row.pct >= 95;
            return (
              <Card key={row.goal.id} style={styles.card} shadow>
                <View style={styles.cardHeader}>
                  <Text style={styles.scope}>{scope}</Text>
                  <Badge variant={onTrack ? 'success' : 'warning'} size="sm">
                    {onTrack ? 'No ritmo' : 'Abaixo'}
                  </Badge>
                </View>
                <Text style={styles.metric}>
                  {row.goal.metric === 'ORDER_VALUE' ? 'Valor de pedidos' : 'Volume de pedidos'}
                </Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                </View>
                <View style={styles.stats}>
                  <Text style={styles.stat}>
                    {formatGoalValue(row.goal.metric, row.realized)} /{' '}
                    {formatGoalValue(row.goal.metric, row.goal.targetValue)}
                  </Text>
                  <Text style={styles.pct}>{row.pct.toFixed(0)}%</Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  error: {
    color: colors.error,
    marginBottom: theme.spacing.sm,
  },
  emptyCard: {
    padding: theme.spacing.lg,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scope: {
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  metric: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent[500],
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stat: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  pct: {
    color: colors.text.primary,
    fontWeight: '700',
  },
});
