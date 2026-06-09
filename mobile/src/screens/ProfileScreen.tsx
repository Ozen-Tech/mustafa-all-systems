import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={[styles.container, flexScroll]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Informações da sua conta</Text>
      </View>

      {user && (
        <Card style={styles.infoCard} shadow>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </Card>
      )}

      <View style={styles.buttonContainer}>
        <Button variant="danger" size="lg" onPress={logout}>
          Sair da Conta
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
  },
  infoCard: {
    marginBottom: theme.spacing.xl,
  },
  infoSection: {
    paddingVertical: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.tertiary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginVertical: theme.spacing.sm,
  },
  buttonContainer: {
    marginTop: theme.spacing.lg,
  },
});

