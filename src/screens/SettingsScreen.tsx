import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import {Button} from '../components/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../components/Card';
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from '../styles/theme';
import {
  getUserTruckId,
  saveUserTruckId,
} from '../services/userSettingsService';

// List of available truck IDs
const TRUCK_IDS = [
  'TRK-001',
  'TRK-002',
  'TRK-003',
  'TRK-004',
  'TRK-005',
  'TRK-006',
  'TRK-007',
  'TRK-008',
  'TRK-009',
  'TRK-010',
];

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface SettingsScreenProps {
  username?: string;
  onNavigate?: (screen: Screen) => void;
  onGoBack?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  username,
  onGoBack,
}) => {
  const [truckId, setTruckId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [savedTruckId, setSavedTruckId] = useState('');

  useEffect(() => {
    loadTruckId();
  }, [username]);

  const loadTruckId = async () => {
    if (!username) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const savedTruckId = await getUserTruckId(username);
      if (savedTruckId) {
        setTruckId(savedTruckId);
      }
    } catch (error) {
      console.error('Error loading truck ID:', error);
      Alert.alert('Error', 'Failed to load truck settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!username) {
      Alert.alert('Error', 'Username not available');
      return;
    }

    if (!truckId) {
      Alert.alert('Error', 'Please select a truck ID');
      return;
    }

    try {
      setSaving(true);
      await saveUserTruckId(username, truckId);
      // Show success notification
      setSavedTruckId(truckId);
      setShowSuccessNotification(true);
      
      // Auto-dismiss notification after 3 seconds and navigate back
      setTimeout(() => {
        setShowSuccessNotification(false);
        if (onGoBack) {
          onGoBack();
        }
      }, 3000);
    } catch (error) {
      console.error('Error saving truck ID:', error);
      Alert.alert('Error', 'Failed to save truck ID');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTruck = (selectedId: string) => {
    setTruckId(selectedId);
    setShowDropdown(false);
  };

  const renderDropdownItem = ({item}: {item: string}) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        truckId === item && styles.dropdownItemSelected,
      ]}
      onPress={() => handleSelectTruck(item)}>
      <Text
        style={[
          styles.dropdownItemText,
          truckId === item && styles.dropdownItemTextSelected,
        ]}>
        {item}
      </Text>
      {truckId === item && (
        <Text style={styles.dropdownItemCheckmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Settings</Text>
          {username && (
            <Text style={styles.headerSubtitle}>Profile: {username}</Text>
          )}
        </View>
        {onGoBack && (
          <Button
            title="Back"
            variant="ghost"
            size="sm"
            onPress={onGoBack}
          />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Card style={styles.settingsCard}>
          <CardHeader>
            <CardTitle>
              <CardTitleText>Vehicle/Truck Selection</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.description}>
              Select the truck number you are currently operating. This will be
              saved and automatically loaded the next time you log in.
            </Text>

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Truck ID</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  saving && styles.dropdownButtonDisabled,
                ]}
                onPress={() => !saving && setShowDropdown(true)}
                disabled={saving}>
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !truckId && styles.dropdownButtonPlaceholder,
                  ]}>
                  {truckId || 'Select a truck...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <Modal
              visible={showDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDropdown(false)}>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDropdown(false)}>
                <View style={styles.dropdownModal}>
                  <View style={styles.dropdownModalHeader}>
                    <Text style={styles.dropdownModalTitle}>
                      Select Truck ID
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowDropdown(false)}
                      style={styles.dropdownModalClose}>
                      <Text style={styles.dropdownModalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={TRUCK_IDS}
                    renderItem={renderDropdownItem}
                    keyExtractor={item => item}
                    style={styles.dropdownList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={styles.buttonRow}>
              <Button
                title="Save"
                variant="primary"
                size="md"
                onPress={handleSave}
                loading={saving}
                disabled={saving || !truckId}
                style={styles.saveButton}
              />
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Success Notification */}
      {showSuccessNotification && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIconContainer}>
              <Text style={styles.notificationIcon}>✓</Text>
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Truck Set Successfully</Text>
              <Text style={styles.notificationSubtitle}>
                Truck: {savedTruckId}
              </Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  settingsCard: {
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    lineHeight: typography.base.lineHeight,
  },
  dropdownContainer: {
    marginBottom: spacing.lg,
  },
  dropdownLabel: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56, // Touch target size
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  dropdownButtonText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  dropdownButtonPlaceholder: {
    color: colors.mutedForeground,
  },
  dropdownArrow: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownModal: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  dropdownModalClose: {
    padding: spacing.xs,
  },
  dropdownModalCloseText: {
    ...typography.xl,
    color: colors.mutedForeground,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56, // Touch target size
  },
  dropdownItemSelected: {
    backgroundColor: colors.muted,
  },
  dropdownItemText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  dropdownItemCheckmark: {
    ...typography.base,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  buttonRow: {
    marginTop: spacing.md,
  },
  saveButton: {
    width: '100%',
  },
  // Success Notification Styles
  notificationOverlay: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    zIndex: 1000,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingRight: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.success,
    minWidth: 280,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.success}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationIcon: {
    fontSize: 24,
    color: colors.success,
    fontWeight: '700',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  notificationSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
});

export default SettingsScreen;
