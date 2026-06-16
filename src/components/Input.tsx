import React, {forwardRef} from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import {Icon} from './Icon';
import {colors, spacing, borderRadius, touchTargets, typography} from '../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
  required?: boolean;
  /** When true, shows an X button to clear the field when it has a value. */
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  containerStyle,
  style,
  size = 'md',
  required = false,
  clearable = false,
  onClear,
  value,
  onChangeText,
  ...props
}, ref) => {
  const showClear =
    clearable && String(value ?? '').length > 0;
  const inputStyle = [
    styles.input,
    size === 'lg' && styles.inputLarge,
    error && styles.inputError,
    showClear && styles.inputWithClear,
    style,
  ];

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChangeText?.('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          style={inputStyle}
          placeholderTextColor={colors.mutedForeground}
          cursorColor={colors.primary}
          selectionColor={`${colors.primary}40`}
          value={value}
          onChangeText={onChangeText}
          {...props}
        />
        {showClear && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Icon name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
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
  requiredAsterisk: {
    color: colors.destructive,
    fontWeight: '700',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
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
  inputWithClear: {
    paddingRight: spacing.xl + spacing.sm,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: touchTargets.min,
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
