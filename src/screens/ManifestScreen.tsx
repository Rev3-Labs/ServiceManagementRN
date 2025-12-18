import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface ManifestScreenProps {
  onNavigate: (screen: Screen) => void;
  onGoBack: () => void;
}

interface MenuItem {
  title: string;
  description: string;
  screen: Screen;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Waste Collection',
    description: 'Manage waste collection and orders',
    screen: 'WasteCollection',
  },
  {
    title: 'Materials & Supplies',
    description: 'Track materials and supplies',
    screen: 'MaterialsSupplies',
  },
  {
    title: 'Service Closeout',
    description: 'Complete service records',
    screen: 'ServiceCloseout',
  },
  {
    title: 'Settings',
    description: 'Configure truck and preferences',
    screen: 'Settings',
  },
];

const ManifestScreen: React.FC<ManifestScreenProps> = ({onNavigate, onGoBack}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clean Earth Inc.</Text>
        <Text style={styles.headerSubtitle}>Service Management Dashboard</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.sectionTitle}>Available Operations</Text>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              console.log('[ManifestScreen] Navigating to:', item.screen);
              onNavigate(item.screen);
            }}>
            <Text style={styles.menuItemTitle}>{item.title}</Text>
            <Text style={styles.menuItemDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.logoutButton}
        activeOpacity={0.7}
        onPress={() => {
          console.log('[ManifestScreen] Logging out');
          onGoBack();
        }}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: '#5a9029',
  },
  headerTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.sm,
    color: '#e0e7e7',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  menuItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  menuItemDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  logoutButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#dc2626',
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    ...typography.base,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ManifestScreen;

