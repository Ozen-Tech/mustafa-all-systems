import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, theme } from '../styles/theme';

interface IndustryNoPhotoToggleProps {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}

export default function IndustryNoPhotoToggle({
  checked,
  disabled,
  loading,
  onToggle,
}: IndustryNoPhotoToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onToggle}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary[300]} />
        ) : checked ? (
          <Text style={styles.checkMark}>✓</Text>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Sem foto desta indústria</Text>
        <Text style={styles.hint}>Marque se não houver imagem para enviar nesta visita</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.cardElevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.dark.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxChecked: {
    borderColor: colors.primary[500],
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  checkMark: {
    color: colors.primary[300],
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.bold,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  hint: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
});
