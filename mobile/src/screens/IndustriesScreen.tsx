import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { storeService, Store } from '../services/storeService';
import {
  dayBoardService,
  SKIP_REASON_LABELS,
  StoreDaySkipReason,
} from '../services/dayBoardService';
import { colors, theme } from '../styles/theme';
import { flexScroll, screenContainer } from '../styles/webLayout';
import { screenStyles } from '../styles/layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScreenHeader from '../components/ui/ScreenHeader';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import LoadingView from '../components/ui/LoadingView';
import { showAlert } from '../utils/alertHelper';

type StoresNavigation = NavigationProp<Record<string, object | undefined>>;

const SKIP_REASONS = Object.keys(SKIP_REASON_LABELS) as StoreDaySkipReason[];

export default function StoresScreen() {
  const navigation = useNavigation<StoresNavigation>();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [completedStoreIdsToday, setCompletedStoreIdsToday] = useState<string[]>([]);
  const [skippedStoreIdsToday, setSkippedStoreIdsToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [skipStore, setSkipStore] = useState<Store | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadStores();
    }, [])
  );

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStores(stores);
    } else {
      const filtered = stores.filter(
        (store) =>
          store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (store.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStores(filtered);
    }
  }, [searchTerm, stores]);

  async function loadStores() {
    try {
      setLoading(true);
      const response = await storeService.getStores();
      setStores(response.stores);
      setFilteredStores(response.stores);
      setCompletedStoreIdsToday(response.completedStoreIdsToday || []);
      setSkippedStoreIdsToday(response.skippedStoreIdsToday || []);
    } catch (error) {
      console.error('Erro ao carregar lojas:', error);
      showAlert('Erro', 'Não foi possível carregar as lojas');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(store: Store) {
    if (completedStoreIdsToday.includes(store.id)) {
      showAlert(
        'Loja já visitada',
        'Você já realizou visita nesta loja hoje. Não é possível fazer nova visita no mesmo dia.'
      );
      return;
    }
    if (skippedStoreIdsToday.includes(store.id)) {
      showAlert(
        'Loja marcada como não feita',
        'Desfaça a marca “Não vou fazer hoje” antes de iniciar a visita.'
      );
      return;
    }

    setCheckingIn(store.id);
    try {
      navigation.navigate('CheckIn', { store });
    } catch (error: any) {
      console.error('Erro ao abrir check-in:', error);
      showAlert('Erro', error?.message || 'Não foi possível abrir o check-in. Tente novamente.');
    } finally {
      setCheckingIn(null);
    }
  }

  async function confirmSkip(reason: StoreDaySkipReason) {
    if (!skipStore) return;
    setSkipping(true);
    try {
      await dayBoardService.skipStoreToday(skipStore.id, reason);
      setSkipStore(null);
      await loadStores();
      showAlert('Registrado', 'Loja marcada como não feita hoje.');
    } catch (error: any) {
      showAlert(
        'Erro',
        error?.response?.data?.message || 'Não foi possível marcar a loja. Tente novamente.'
      );
    } finally {
      setSkipping(false);
    }
  }

  async function handleUnskip(store: Store) {
    try {
      setSkipping(true);
      await dayBoardService.unskipStoreToday(store.id);
      await loadStores();
    } catch (error: any) {
      showAlert(
        'Erro',
        error?.response?.data?.message || 'Não foi possível desfazer. Tente novamente.'
      );
    } finally {
      setSkipping(false);
    }
  }

  if (loading) {
    return <LoadingView message="Carregando lojas..." />;
  }

  return (
    <View style={[screenStyles.root, screenContainer]}>
      <View style={screenStyles.headerBand}>
        <ScreenHeader
          title="Suas lojas"
          subtitle={`${filteredStores.length} loja${filteredStores.length !== 1 ? 's' : ''} na rota de hoje`}
        />
        <Input
          placeholder="Buscar por nome ou endereço"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        style={flexScroll}
        data={filteredStores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const alreadyVisitedToday = completedStoreIdsToday.includes(item.id);
          const skippedToday = skippedStoreIdsToday.includes(item.id);
          return (
            <Card
              key={item.id}
              style={[
                styles.storeCard,
                { marginTop: index === 0 ? 0 : theme.spacing.md },
                (alreadyVisitedToday || skippedToday) && styles.storeCardDone,
              ]}
              shadow
            >
              <View style={styles.storeHeader}>
                <View
                  style={[
                    styles.storeIcon,
                    alreadyVisitedToday && styles.storeIconDone,
                    skippedToday && styles.storeIconSkipped,
                  ]}
                >
                  <Text style={styles.storeIconText}>
                    {item.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.storeInfo}>
                  <View style={styles.storeTitleRow}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    {alreadyVisitedToday ? (
                      <Badge variant="success" size="sm">
                        Feita
                      </Badge>
                    ) : skippedToday ? (
                      <Badge variant="gray" size="sm">
                        Não feita
                      </Badge>
                    ) : null}
                  </View>
                  <Text style={styles.storeAddress}>{item.address}</Text>
                </View>
              </View>

              {alreadyVisitedToday ? (
                <Button variant="outline" size="md" disabled style={styles.checkInButton}>
                  Visita feita hoje
                </Button>
              ) : skippedToday ? (
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => handleUnskip(item)}
                  isLoading={skipping}
                  disabled={skipping || checkingIn !== null}
                  style={styles.checkInButton}
                >
                  Desfazer “não feita”
                </Button>
              ) : (
                <View style={styles.actionsCol}>
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => handleCheckIn(item)}
                    isLoading={checkingIn === item.id}
                    disabled={checkingIn !== null || skipping}
                    style={styles.checkInButton}
                  >
                    Iniciar visita
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onPress={() => setSkipStore(item)}
                    disabled={checkingIn !== null || skipping}
                    style={styles.skipButton}
                  >
                    Não vou fazer hoje
                  </Button>
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title={searchTerm ? 'Nenhuma loja encontrada' : 'Nenhuma loja na rota'}
            description={
              searchTerm
                ? 'Tente outro termo de busca'
                : 'As lojas atribuídas ao seu perfil aparecerão aqui'
            }
          />
        }
      />

      <Modal
        visible={!!skipStore}
        transparent
        animationType="fade"
        onRequestClose={() => !skipping && setSkipStore(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !skipping && setSkipStore(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Não vou fazer hoje</Text>
            <Text style={styles.modalSubtitle}>
              {skipStore?.name}
              {'\n'}
              Escolha o motivo. Isso fecha a loja na rota do dia, sem pontos de visita.
            </Text>
            {skipping ? (
              <ActivityIndicator color={colors.primary[400]} style={{ marginVertical: 16 }} />
            ) : (
              SKIP_REASONS.map((reason) => (
                <Button
                  key={reason}
                  variant="outline"
                  size="md"
                  onPress={() => confirmSkip(reason)}
                  style={styles.reasonButton}
                >
                  {SKIP_REASON_LABELS[reason]}
                </Button>
              ))
            )}
            <Button
              variant="ghost"
              size="md"
              onPress={() => setSkipStore(null)}
              disabled={skipping}
              style={{ marginTop: theme.spacing.sm }}
            >
              Cancelar
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: theme.spacing.md,
  },
  storeCard: {
    marginBottom: theme.spacing.md,
  },
  storeCardDone: {
    opacity: 0.9,
    borderColor: colors.dark.borderLight,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  storeIconDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  storeIconSkipped: {
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  storeIconText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[300],
  },
  storeInfo: {
    flex: 1,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  storeName: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  storeAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  actionsCol: {
    gap: theme.spacing.sm,
  },
  checkInButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.dark.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  reasonButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
});
