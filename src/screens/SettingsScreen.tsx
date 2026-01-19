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
import {Icon} from '../components/Icon';
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
import {offlineTrackingService} from '../services/offlineTrackingService';
import {serviceCenterService} from '../services/serviceCenterService';

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
  const [selectedOfflineScenario, setSelectedOfflineScenario] = useState<number | null>(null);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);

  useEffect(() => {
    loadTruckId();
    // Check current debug state
    const currentDebug = offlineTrackingService.getDebugDurationHours();
    setSelectedOfflineScenario(currentDebug);
    
    // Subscribe to offline status changes to update UI if changed elsewhere
    const unsubscribe = offlineTrackingService.onStatusChange(() => {
      const currentDebug = offlineTrackingService.getDebugDurationHours();
      setSelectedOfflineScenario(currentDebug);
    });
    
    return unsubscribe;
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
        <Icon name="check" size={20} color={colors.primary} />
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
                <Icon name="keyboard-arrow-down" size={20} color={colors.mutedForeground} />
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
                      <Icon name="close" size={20} color={colors.foreground} />
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

        {/* Offline Debug Panel */}
        <Card style={styles.settingsCard}>
          <CardHeader>
            <CardTitle>
              <CardTitleText>Offline Status Testing</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.description}>
              Simulate different offline scenarios for testing and demonstrations.
            </Text>

            <View style={styles.debugButtonRow}>
              <Button
                title="Online"
                variant={selectedOfflineScenario === null ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(null);
                  setSelectedOfflineScenario(null);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
              <Button
                title="7 hrs"
                variant={selectedOfflineScenario === 7 ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(7);
                  setSelectedOfflineScenario(7);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
              <Button
                title="8 hrs"
                variant={selectedOfflineScenario === 8 ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(8);
                  setSelectedOfflineScenario(8);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
            </View>

            <View style={styles.debugButtonRow}>
              <Button
                title="9 hrs"
                variant={selectedOfflineScenario === 9 ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(9);
                  setSelectedOfflineScenario(9);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
              <Button
                title="9.5 hrs"
                variant={selectedOfflineScenario === 9.5 ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(9.5);
                  setSelectedOfflineScenario(9.5);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
              <Button
                title="10 hrs"
                variant={selectedOfflineScenario === 10 ? "primary" : "outline"}
                size="sm"
                onPress={() => {
                  offlineTrackingService.setDebugOfflineDuration(10);
                  setSelectedOfflineScenario(10);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButton}
              />
            </View>

            <View style={styles.debugButtonRow}>
              <Button
                title="Reset to Normal"
                variant="ghost"
                size="sm"
                onPress={() => {
                  offlineTrackingService.resetDebugMode();
                  setSelectedOfflineScenario(null);
                  setShowOfflineNotification(true);
                  setTimeout(() => setShowOfflineNotification(false), 2000);
                }}
                style={styles.debugButtonReset}
              />
            </View>
          </CardContent>
        </Card>

        {/* Service Center Testing */}
        <Card style={styles.settingsCard}>
          <CardHeader>
            <CardTitle>
              <CardTitleText>Service Center Testing</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.description}>
              Test Service Center display and update notifications.
            </Text>

            <View style={styles.debugButtonRow}>
              <Button
                title="Dallas SC"
                variant="outline"
                size="sm"
                onPress={async () => {
                  const changed = await serviceCenterService.setServiceCenter(
                    'Dallas Service Center',
                    'DAL',
                    '1234 Main St, Dallas, TX 75201'
                  );
                }}
                style={styles.debugButton}
              />
              <Button
                title="Houston SC"
                variant="outline"
                size="sm"
                onPress={async () => {
                  const changed = await serviceCenterService.setServiceCenter(
                    'Houston Service Center',
                    'HOU',
                    '5678 Commerce Blvd, Houston, TX 77001'
                  );
                }}
                style={styles.debugButton}
              />
              <Button
                title="Austin SC"
                variant="outline"
                size="sm"
                onPress={async () => {
                  const changed = await serviceCenterService.setServiceCenter(
                    'Austin Service Center',
                    'AUS',
                    '9012 Capital Way, Austin, TX 78701'
                  );
                }}
                style={styles.debugButton}
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
              <Icon name="check-circle" size={20} color={colors.success} />
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

      {/* Offline Scenario Notification */}
      {showOfflineNotification && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIconContainer}>
              <Icon name="check-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                {selectedOfflineScenario === null 
                  ? 'Online Mode Active' 
                  : `Offline: ${selectedOfflineScenario} hrs`}
              </Text>
              <Text style={styles.notificationSubtitle}>
                Scenario applied successfully
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
  buttonRow: {
    marginTop: spacing.md,
  },
  saveButton: {
    width: '100%',
  },
  debugButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  debugButton: {
    flex: 1,
    minWidth: 100,
  },
  debugButtonReset: {
    width: '100%',
    marginTop: spacing.xs,
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
