import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, theme } from '../../styles/theme';
import { screenStyles } from '../../styles/layout';

interface LoadingViewProps {
  message?: string;
}

export default function LoadingView({ message = 'Carregando...' }: LoadingViewProps) {
  return (
    <View style={[screenStyles.root, styles.center]}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
