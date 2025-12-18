import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {colors, typography, spacing} from '../styles/theme';

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface ServiceCloseoutScreenProps {
  onNavigate: (screen: Screen) => void;
  onGoBack: () => void;
}

const ServiceCloseoutScreen: React.FC<ServiceCloseoutScreenProps> = ({onNavigate, onGoBack}) => {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        activeOpacity={0.7}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Service Closeout</Text>
        <Text style={styles.subtitle}>
          Tablet workflow for service closeout process
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Service closeout interface coming soon
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
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
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  placeholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: spacing.lg,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});

export default ServiceCloseoutScreen;

