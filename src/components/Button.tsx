import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, borderRadius, touchTargets, typography} from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    fullWidth && styles.buttonFullWidth,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      // Larger hit slop for easier touch on rugged tablets
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.primary}
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.comfortable,
  },
  buttonFullWidth: {
    width: '100%',
  },
  button_primary: {
    backgroundColor: colors.primary,
    // Subtle shadow for depth perception
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button_secondary: {
    backgroundColor: colors.secondary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2, // Thicker border for visibility
    borderColor: colors.border,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_destructive: {
    backgroundColor: colors.destructive,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Sized for gloved hands / industrial use
  button_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTargets.min,
  },
  button_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touchTargets.comfortable,
  },
  button_lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: touchTargets.large,
  },
  button_xl: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    minHeight: touchTargets.xlarge,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600', // Slightly bolder for readability
    textAlign: 'center',
  },
  text_primary: {
    color: colors.primaryForeground,
  },
  text_secondary: {
    color: colors.secondaryForeground,
  },
  text_outline: {
    color: colors.foreground,
  },
  text_ghost: {
    color: colors.foreground,
  },
  text_destructive: {
    color: colors.destructiveForeground,
  },
  text_sm: {
    ...typography.sm,
    fontWeight: '600',
  },
  text_md: {
    ...typography.base,
    fontWeight: '600',
  },
  text_lg: {
    ...typography.lg,
    fontWeight: '600',
  },
  text_xl: {
    ...typography.xl,
    fontWeight: '700',
  },
});
