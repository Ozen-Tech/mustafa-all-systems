import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { visitService } from '../services/visitService';
import { colors, theme } from '../styles/theme';
import { flexScroll, screenContainer } from '../styles/webLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ScreenHeader from '../components/ui/ScreenHeader';
import FilterChips from '../components/ui/FilterChips';
import EmptyState from '../components/ui/EmptyState';
import LoadingView from '../components/ui/LoadingView';
import { screenStyles } from '../styles/layout';

interface Visit {
  id: string;
  store: {
    id: string;
    name: string;
    address: string;
  };
  checkInAt: string;
  checkOutAt: string | null;
  hoursWorked: string | null;
  photoCount: number;
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    loadVisits();
  }, []);

  async function loadVisits() {
    try {
      setLoading(true);
      const response = await visitService.getVisits();
      setVisits(response.visits || []);
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadVisits();
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredVisits = visits.filter((visit) => {
    if (filter === 'completed') return visit.checkOutAt !== null;
    if (filter === 'pending') return visit.checkOutAt === null;
    return true;
  });

  if (loading && !refreshing) {
    return <LoadingView message="Carregando histórico..." />;
  }

  const filterOptions = [
    { id: 'all' as const, label: 'Todas' },
    { id: 'completed' as const, label: 'Concluídas' },
    { id: 'pending' as const, label: 'Pendentes' },
  ];

  return (
    <View style={[screenStyles.root, screenContainer]}>
      <View style={screenStyles.headerBand}>
        <ScreenHeader
          title="Histórico"
          subtitle={`${filteredVisits.length} visita${filteredVisits.length !== 1 ? 's' : ''} encontrada${filteredVisits.length !== 1 ? 's' : ''}`}
        />
        <FilterChips options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {/* Lista de Visitas */}
      <ScrollView
        style={[styles.scrollView, flexScroll]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary[600]} />
        }
      >
        {filteredVisits.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nenhuma visita encontrada"
            description={
              filter === 'all'
                ? 'Suas visitas aparecerão aqui'
                : filter === 'completed'
                  ? 'Nenhuma visita concluída neste filtro'
                  : 'Nenhuma visita pendente neste filtro'
            }
          />
        ) : (
          filteredVisits.map((visit) => (
            <Card key={visit.id} style={styles.visitCard} shadow>
              <View style={styles.visitHeader}>
                <View style={styles.visitStoreInfo}>
                  <Text style={styles.visitStoreName}>{visit.store.name}</Text>
                  <Text style={styles.visitStoreAddress}>{visit.store.address}</Text>
                </View>
                {visit.checkOutAt ? (
                  <Badge variant="success" size="sm">
                    Concluída
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Pendente
                  </Badge>
                )}
              </View>

              <View style={styles.visitDetails}>
                <View style={styles.visitDetailRow}>
                  <View style={styles.visitDetailItem}>
                    <Text style={styles.visitDetailLabel}>Data</Text>
                    <Text style={styles.visitDetailValue}>{formatDate(visit.checkInAt)}</Text>
                  </View>
                  <View style={styles.visitDetailItem}>
                    <Text style={styles.visitDetailLabel}>Check-in</Text>
                    <Text style={styles.visitDetailValue}>{formatTime(visit.checkInAt)}</Text>
                  </View>
                </View>

                {visit.checkOutAt && (
                  <View style={styles.visitDetailRow}>
                    <View style={styles.visitDetailItem}>
                      <Text style={styles.visitDetailLabel}>Checkout</Text>
                      <Text style={styles.visitDetailValue}>{formatTime(visit.checkOutAt)}</Text>
                    </View>
                    <View style={styles.visitDetailItem}>
                      <Text style={styles.visitDetailLabel}>Duração</Text>
                      <Text style={[styles.visitDetailValue, styles.visitDetailValueHighlight]}>
                        {visit.hoursWorked || '-'}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.visitFooter}>
                  <Text style={styles.visitPhotoText}>{visit.photoCount || 0} fotos registradas</Text>
                </View>
              </View>
            </Card>
          ))
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
  header: {
    padding: theme.spacing.lg,
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  filters: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    ...theme.shadows.primary,
  },
  filterButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  visitStoreInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  visitStoreName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  visitStoreAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  visitDetails: {
    gap: theme.spacing.md,
  },
  visitDetailRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  visitDetailItem: {
    flex: 1,
  },
  visitDetailLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visitDetailValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  visitDetailValueHighlight: {
    color: colors.primary[400],
    fontWeight: theme.typography.fontWeight.bold,
  },
  visitFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  visitPhotoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  visitPhotoIcon: {
    fontSize: 16,
  },
  visitPhotoText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
  },
});
