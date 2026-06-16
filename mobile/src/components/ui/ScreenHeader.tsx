import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, theme } from '../../styles/theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  style?: ViewStyle;
  trailing?: React.ReactNode;
}

export default function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  style,
  trailing,
}: ScreenHeaderProps) {
  const alignStyle = align === 'center' ? styles.center : undefined;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.textBlock, alignStyle, trailing ? styles.withTrailing : undefined]}>
        {eyebrow ? <Text style={[styles.eyebrow, alignStyle]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, alignStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, alignStyle]}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
  },
  withTrailing: {
    paddingRight: theme.spacing.md,
  },
  center: {
    textAlign: 'center',
    alignItems: 'center',
  },
  trailing: {
    marginTop: theme.spacing.xs,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
