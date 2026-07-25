import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useGeneralOnboarding } from '../navigation/MainNavigator';
import { storeService, Store } from '../services/storeService';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import { layout, screenStyles } from '../styles/layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Section from '../components/ui/Section';

function getInitials(name?: string) {
  if (!name) return 'PG';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { openGeneralOnboarding } = useGeneralOnboarding();
  const [myStores, setMyStores] = React.useState<Store[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);

  const reload = useCallback(() => {
    storeService
      .getOnboarding()
      .then((res) => {
        setMyStores(res.stores || []);
        setPendingCount(res.storesPendingIndustries?.length || 0);
      })
      .catch(() => {
        setMyStores([]);
        setPendingCount(0);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <ScrollView style={[screenStyles.root, flexScroll]} contentContainerStyle={styles.content}>
      <ScreenHeader title="Perfil" subtitle="Dados da sua conta no Promo Gestão" />

      {user ? (
        <Card shadow style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            <View style={styles.identity}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Section title="Conta">
        <Card shadow>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Função</Text>
            <Text style={styles.infoValue}>Promotor de vendas</Text>
          </View>
        </Card>
      </Section>

      <Section title="Minha rota">
        <Card shadow>
          {myStores.length > 0 ? (
            <Text style={styles.listText}>{myStores.map((s) => s.name).join(' · ')}</Text>
          ) : (
            <Text style={styles.emptyText}>Nenhuma loja na rota ainda.</Text>
          )}
          {pendingCount > 0 ? (
            <Text style={styles.pendingText}>
              {pendingCount} loja(s) ainda sem indústrias configuradas.
            </Text>
          ) : null}
          <Button
            variant="outline"
            size="md"
            onPress={openGeneralOnboarding}
            style={styles.editBtn}
          >
            Editar lojas e indústrias
          </Button>
        </Card>
      </Section>

      <Button variant="danger" size="lg" onPress={logout} style={styles.logout}>
        Sair da conta
      </Button>
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
  profileCard: {
    padding: theme.spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary[300],
    fontWeight: '700',
    fontSize: 18,
  },
  identity: {
    flex: 1,
  },
  name: {
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
  },
  email: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: colors.text.secondary,
  },
  infoValue: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  listText: {
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    color: colors.text.tertiary,
    marginBottom: theme.spacing.md,
  },
  pendingText: {
    color: colors.warning,
    marginBottom: theme.spacing.md,
    fontSize: 13,
  },
  editBtn: {
    alignSelf: 'stretch',
  },
  logout: {
    marginTop: theme.spacing.sm,
  },
});
