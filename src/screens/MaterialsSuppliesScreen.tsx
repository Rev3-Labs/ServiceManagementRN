import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, typography, spacing} from '../styles/theme';

const MaterialsSuppliesScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Materials & Supplies Flow</Text>
        <Text style={styles.subtitle}>
          Tablet workflow for materials and supplies management
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.base,
    color: colors.mutedForeground,
  },
});

export default MaterialsSuppliesScreen;

