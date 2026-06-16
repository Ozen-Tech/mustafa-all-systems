import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme } from '../../styles/theme';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Section({ title, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
