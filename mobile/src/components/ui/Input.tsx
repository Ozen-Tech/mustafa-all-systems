import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, theme } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  hint,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholderTextColor={colors.text.tertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.dark.card,
  },
  inputFocused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.dark.cardElevated,
  },
  hint: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});
