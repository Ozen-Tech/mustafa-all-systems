import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { storeService, Store } from '../services/storeService';
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
import { ensureLocationPermission, getCurrentPosition } from '../utils/locationHelper';
import { showAlert } from '../utils/alertHelper';

type StoresNavigation = NavigationProp<Record<string, object | undefined>>;

export default function StoresScreen() {
  const navigation = useNavigation<StoresNavigation>();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [completedStoreIdsToday, setCompletedStoreIdsToday] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    try {
      setCheckingIn(store.id);

      // Tenta permissão/GPS, mas NÃO trava o fluxo: muitos celulares bloqueiam o site
      // e o alerta antigo impedia o promotor de entrar na loja.
      const hasPermission = await ensureLocationPermission({ showAlertWhenDenied: false });

      let location: { latitude: number; longitude: number } | undefined;

      if (hasPermission) {
        try {
          const pos = await getCurrentPosition({ timeout: 12_000, maximumAge: 60_000 });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch (gpsError: any) {
          console.warn('[Stores] GPS indisponível agora:', gpsError);
        }
      } else {
        showAlert(
          'Ative a localização do site',
          [
            'Vamos abrir o check-in mesmo assim.',
            '',
            'Para o GPS funcionar:',
            '1. Toque no cadeado (ou ⓘ) ao lado do endereço',
            '2. Localização → Permitir',
            '3. Ou: menu do Chrome → Configurações do site → Localização → Permitir',
            '4. Deixe a Localização do celular ligada',
            '',
            'Na próxima tela, se pedir permissão, toque em Permitir.',
          ].join('\n')
        );
      }

      navigation.navigate('CheckIn', {
        store,
        location,
      });
    } catch (error: any) {
      console.error('Erro ao fazer check-in:', error);
      showAlert(
        'Erro',
        error?.message ||
          'Erro ao iniciar check-in. Verifique a permissão de localização e a memória do celular.'
      );
    } finally {
      setCheckingIn(null);
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

      {/* Lista de Lojas */}
      <FlatList
        style={flexScroll}
        data={filteredStores}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const alreadyVisitedToday = completedStoreIdsToday.includes(item.id);
          return (
            <Card
              key={item.id}
              style={[
                styles.storeCard,
                { marginTop: index === 0 ? 0 : theme.spacing.md },
                alreadyVisitedToday && styles.storeCardDone,
              ]}
              shadow
            >
              <View style={styles.storeHeader}>
                <View style={[styles.storeIcon, alreadyVisitedToday && styles.storeIconDone]}>
                  <Text style={styles.storeIconText}>
                    {item.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.storeInfo}>
                  <View style={styles.storeTitleRow}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    {alreadyVisitedToday ? (
                      <Badge variant="gray" size="sm">
                        Concluída
                      </Badge>
                    ) : null}
                  </View>
                  <Text style={styles.storeAddress}>{item.address}</Text>
                </View>
              </View>
              <Button
                variant={alreadyVisitedToday ? 'outline' : 'primary'}
                size="md"
                onPress={() => handleCheckIn(item)}
                isLoading={checkingIn === item.id}
                disabled={checkingIn !== null || alreadyVisitedToday}
                style={styles.checkInButton}
              >
                {alreadyVisitedToday ? 'Visita feita hoje' : 'Iniciar check-in'}
              </Button>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.dark.card,
  },
  clearButton: {
    marginLeft: theme.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  storeCard: {
    marginBottom: theme.spacing.md,
  },
  storeCardDone: {
    opacity: 0.85,
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
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  storeIconText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[300],
  },
  storeIconDone: {
    backgroundColor: colors.gray[700],
    borderColor: colors.dark.border,
  },
  storeInfo: {
    flex: 1,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
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
  alreadyVisitedLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.primary[400],
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  checkInButton: {
    width: '100%',
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
