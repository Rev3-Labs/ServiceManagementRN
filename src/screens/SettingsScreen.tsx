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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
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
  getUserTruck,
  saveUserTruck,
  getUserTrailer,
  saveUserTrailer,
} from '../services/userSettingsService';
import {offlineTrackingService} from '../services/offlineTrackingService';
import {serviceCenterService} from '../services/serviceCenterService';
import {vehicleService, Truck, Trailer} from '../services/vehicleService';
import {Input} from '../components/Input';

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
  const [truckId, setTruckId] = useState(''); // Keep for backward compatibility display
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTruckDropdown, setShowTruckDropdown] = useState(false);
  const [showTrailerDropdown, setShowTrailerDropdown] = useState(false);
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [trailerSearchQuery, setTrailerSearchQuery] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [savedTruckId, setSavedTruckId] = useState('');
  const [selectedOfflineScenario, setSelectedOfflineScenario] = useState<number | null>(null);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [serviceCenter, setServiceCenter] = useState(serviceCenterService.getServiceCenter());

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
      // Load truck and trailer objects
      const truck = await getUserTruck(username);
      const trailer = await getUserTrailer(username);
      
      if (truck) {
        setSelectedTruck(truck);
        setTruckId(truck.number); // For backward compatibility
      } else {
        // Fallback to old truck ID format
        const savedTruckId = await getUserTruckId(username);
        if (savedTruckId) {
          setTruckId(savedTruckId);
          // Try to find truck by number
          const truckByNumber = vehicleService.getTruckByNumber(savedTruckId);
          if (truckByNumber) {
            setSelectedTruck(truckByNumber);
          }
        }
      }
      
      if (trailer) {
        setSelectedTrailer(trailer);
      }
    } catch (error) {
      console.error('Error loading vehicle settings:', error);
      Alert.alert('Error', 'Failed to load vehicle settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!username) {
      Alert.alert('Error', 'Username not available');
      return;
    }

    if (!selectedTruck) {
      Alert.alert('Error', 'Please select a truck');
      return;
    }

    try {
      setSaving(true);
      await saveUserTruck(username, selectedTruck);
      await saveUserTrailer(username, selectedTrailer);
      // Show success notification
      setSavedTruckId(selectedTruck.number);
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

  // Subscribe to Service Center changes to update available trucks
  useEffect(() => {
    const unsubscribe = serviceCenterService.onServiceCenterChange((newServiceCenter) => {
      setServiceCenter(newServiceCenter);
    });
    return unsubscribe;
  }, []);

  const handleSelectTruck = (truck: Truck) => {
    setSelectedTruck(truck);
    setTruckId(truck.number);
    setShowTruckDropdown(false);
    setTruckSearchQuery('');
  };

  const handleSelectTrailer = (trailer: Trailer | null) => {
    setSelectedTrailer(trailer);
    setShowTrailerDropdown(false);
    setTrailerSearchQuery('');
  };

  const filteredTrucks = vehicleService.searchTrucks(
    serviceCenter?.name || null,
    truckSearchQuery
  );

  const filteredTrailers = vehicleService.searchTrailers(trailerSearchQuery);

  const renderTruckItem = ({item}: {item: Truck}) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedTruck?.id === item.id && styles.dropdownItemSelected,
      ]}
      onPress={() => handleSelectTruck(item)}>
      <Text
        style={[
          styles.dropdownItemText,
          selectedTruck?.id === item.id && styles.dropdownItemTextSelected,
        ]}>
        {vehicleService.formatTruckDisplay(item)}
      </Text>
      {selectedTruck?.id === item.id && (
        <Icon name="check" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderTrailerItem = ({item}: {item: Trailer | null}) => {
    if (item === null) {
      return (
        <TouchableOpacity
          style={[
            styles.dropdownItem,
            selectedTrailer === null && styles.dropdownItemSelected,
          ]}
          onPress={() => handleSelectTrailer(null)}>
          <Text
            style={[
              styles.dropdownItemText,
              selectedTrailer === null && styles.dropdownItemTextSelected,
            ]}>
            No Trailer
          </Text>
          {selectedTrailer === null && (
            <Icon name="check" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[
          styles.dropdownItem,
          selectedTrailer?.id === item.id && styles.dropdownItemSelected,
        ]}
        onPress={() => handleSelectTrailer(item)}>
        <Text
          style={[
            styles.dropdownItemText,
            selectedTrailer?.id === item.id && styles.dropdownItemTextSelected,
          ]}>
          {vehicleService.formatTrailerDisplay(item)}
        </Text>
        {selectedTrailer?.id === item.id && (
          <Icon name="check" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

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
              Select the truck and trailer you are currently operating. These will be
              saved and automatically loaded the next time you log in.
            </Text>

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Truck *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  saving && styles.dropdownButtonDisabled,
                ]}
                onPress={() => !saving && setShowTruckDropdown(true)}
                disabled={saving}>
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !selectedTruck && styles.dropdownButtonPlaceholder,
                  ]}>
                  {selectedTruck 
                    ? vehicleService.formatTruckDisplay(selectedTruck)
                    : 'Select a truck...'}
                </Text>
                <Icon name="keyboard-arrow-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Trailer</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  saving && styles.dropdownButtonDisabled,
                ]}
                onPress={() => !saving && setShowTrailerDropdown(true)}
                disabled={saving}>
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !selectedTrailer && styles.dropdownButtonPlaceholder,
                  ]}>
                  {selectedTrailer 
                    ? vehicleService.formatTrailerDisplay(selectedTrailer)
                    : 'Select a trailer (optional)...'}
                </Text>
                <Icon name="keyboard-arrow-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Truck Selection Modal */}
            <Modal
              visible={showTruckDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => {
                setShowTruckDropdown(false);
                setTruckSearchQuery('');
              }}>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowTruckDropdown(false);
                  setTruckSearchQuery('');
                }}>
                <View style={styles.dropdownModal}>
                  <View style={styles.dropdownModalHeader}>
                    <Text style={styles.dropdownModalTitle}>
                      Select Truck
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowTruckDropdown(false);
                        setTruckSearchQuery('');
                      }}
                      style={styles.dropdownModalClose}>
                      <Icon name="close" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.searchContainer}>
                    <Input
                      placeholder="Search trucks..."
                      value={truckSearchQuery}
                      onChangeText={setTruckSearchQuery}
                      style={styles.searchInput}
                    />
                  </View>
                  <FlatList
                    data={filteredTrucks}
                    renderItem={renderTruckItem}
                    keyExtractor={item => item.id}
                    style={styles.dropdownList}
                    ListEmptyComponent={
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No trucks found</Text>
                      </View>
                    }
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Trailer Selection Modal */}
            <Modal
              visible={showTrailerDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => {
                setShowTrailerDropdown(false);
                setTrailerSearchQuery('');
              }}>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowTrailerDropdown(false);
                  setTrailerSearchQuery('');
                }}>
                <View style={styles.dropdownModal}>
                  <View style={styles.dropdownModalHeader}>
                    <Text style={styles.dropdownModalTitle}>
                      Select Trailer
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowTrailerDropdown(false);
                        setTrailerSearchQuery('');
                      }}
                      style={styles.dropdownModalClose}>
                      <Icon name="close" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.searchContainer}>
                    <Input
                      placeholder="Search trailers..."
                      value={trailerSearchQuery}
                      onChangeText={setTrailerSearchQuery}
                      style={styles.searchInput}
                    />
                  </View>
                  <FlatList
                    data={[null, ...filteredTrailers]}
                    renderItem={renderTrailerItem}
                    keyExtractor={(item, index) => item ? item.id : `no-trailer-${index}`}
                    style={styles.dropdownList}
                    ListEmptyComponent={
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No trailers found</Text>
                      </View>
                    }
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
                disabled={saving || !selectedTruck}
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
              <Text style={styles.notificationTitle}>Vehicles Set Successfully</Text>
              <Text style={styles.notificationSubtitle}>
                Truck: {savedTruckId}
                {selectedTrailer && ` • Trailer: ${selectedTrailer.number}`}
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    marginBottom: 0,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...typography.base,
    color: colors.mutedForeground,
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
