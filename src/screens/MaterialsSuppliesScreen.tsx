import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {colors, typography, spacing} from '../styles/theme';
import {Icon} from '../components/Icon';

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface MaterialsSuppliesScreenProps {
  onNavigate: (screen: Screen) => void;
  onGoBack: () => void;
}

const MaterialsSuppliesScreen: React.FC<MaterialsSuppliesScreenProps> = ({onNavigate, onGoBack}) => {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        activeOpacity={0.7}>
        <Icon name="arrow-back" size={20} color={colors.foreground} style={styles.backButtonIcon} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Materials & Supplies</Text>
        <Text style={styles.subtitle}>
          Tablet workflow for materials and supplies management
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Materials and supplies tracking interface coming soon
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

export default MaterialsSuppliesScreen;

