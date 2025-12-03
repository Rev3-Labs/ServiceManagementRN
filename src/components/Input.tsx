import React, {forwardRef} from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {colors, spacing, borderRadius, touchTargets, typography} from '../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  containerStyle,
  style,
  size = 'md',
  ...props
}, ref) => {
  const inputStyle = [
    styles.input,
    size === 'lg' && styles.inputLarge,
    error && styles.inputError,
    style,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        style={inputStyle}
        placeholderTextColor={colors.mutedForeground}
        // Larger cursor for visibility
        cursorColor={colors.primary}
        selectionColor={`${colors.primary}40`}
        {...props}
      />
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.base,
    minHeight: touchTargets.comfortable,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inputBackground,
    borderWidth: 2, // Thicker border for visibility
    borderColor: colors.input,
    borderRadius: borderRadius.md,
    color: colors.foreground,
  },
  inputLarge: {
    minHeight: touchTargets.large,
    ...typography.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: colors.destructive,
    borderWidth: 2,
  },
  hintText: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.sm,
    color: colors.destructive,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
});
