import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme } from '../../styles/theme';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export default function EmptyState({ title, description, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: {
    marginTop: theme.spacing.lg,
    width: '100%',
  },
});
