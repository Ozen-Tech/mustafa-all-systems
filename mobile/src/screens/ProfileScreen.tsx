import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
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
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[300],
  },
  identity: {
    flex: 1,
  },
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  infoRow: {
    gap: theme.spacing.xs,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  logout: {
    width: '100%',
  },
});
