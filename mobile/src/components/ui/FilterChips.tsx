import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, theme } from '../../styles/theme';

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.primary[300],
  },
});
