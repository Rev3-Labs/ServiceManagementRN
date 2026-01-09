import React from 'react';
import {View, Text, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = true,
}) => {
  return (
    <View style={[styles.card, padding && styles.cardPadding, style]}>
      {children}
    </View>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({children, style}) => {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
};

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardContent: React.FC<CardContentProps> = ({children, style}) => {
  return <View style={[styles.cardContent, style]}>{children}</View>;
};

interface CardTitleProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardTitle: React.FC<CardTitleProps> = ({children, style}) => {
  return <View style={[styles.cardTitle, style]}>{children}</View>;
};

// Helper component for CardTitle text
export const CardTitleText: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  return <Text style={styles.cardTitleText}>{children}</Text>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadding: {
    padding: spacing.lg,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardContent: {
    // Content styles
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
  cardTitleText: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
});

