import React from 'react';
import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  style?: ViewStyle;
  textStyle?: TextStyle;
  title?: string; // Tooltip/accessibility label
  trailingIcon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
  title,
  trailingIcon,
}) => {
  const content = trailingIcon ? (
    <View style={styles.badgeContentRow}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>{children}</Text>
      {trailingIcon}
    </View>
  ) : (
    <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>{children}</Text>
  );
  return (
    <View
      style={[styles.badge, styles[`badge_${variant}`], style]}
      accessibilityLabel={title || undefined}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge_default: {
    backgroundColor: colors.primary,
  },
  badge_secondary: {
    backgroundColor: colors.secondary,
    color: colors.primaryForeground,

  },
  badge_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge_destructive: {
    backgroundColor: colors.destructive,
  },
  text: {
    ...typography.sm,
    fontWeight: '500',
  },
  text_default: {
    color: colors.primaryForeground,
  },
  text_secondary: {
    color: colors.secondaryForeground,
  },
  text_outline: {
    color: colors.foreground,
  },
  text_destructive: {
    color: colors.destructiveForeground,
  },
});

