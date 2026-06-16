import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme } from '../../styles/theme';

interface MetricCardProps {
  label: string;
  value: string;
  accent?: 'primary' | 'accent' | 'success' | 'default';
  style?: ViewStyle;
}

export default function MetricCard({ label, value, accent = 'default', style }: MetricCardProps) {
  const valueColor =
    accent === 'primary'
      ? colors.primary[400]
      : accent === 'accent'
        ? colors.accent[400]
        : accent === 'success'
          ? colors.success
          : colors.text.primary;

  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.cardElevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  value: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
