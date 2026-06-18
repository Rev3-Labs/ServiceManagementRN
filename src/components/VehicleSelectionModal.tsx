import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {Button} from './Button';
import {Icon} from './Icon';
import {Input} from './Input';
import {vehicleService, Truck, Trailer} from '../services/vehicleService';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

interface VehicleSelectionModalProps {
  visible: boolean;
  serviceCenterName: string | null;
  initialTruck: Truck | null;
  initialTrailer: Trailer | null;
  allowCancel?: boolean;
  onConfirm: (truck: Truck, trailer: Trailer | null) => void | Promise<void>;
  onCancel?: () => void;
}

export const VehicleSelectionModal: React.FC<VehicleSelectionModalProps> = ({
  visible,
  serviceCenterName,
  initialTruck,
  initialTrailer,
  allowCancel = false,
  onConfirm,
  onCancel,
}) => {
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(initialTruck);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(
    initialTrailer,
  );
  const [showTruckDropdown, setShowTruckDropdown] = useState(false);
  const [showTrailerDropdown, setShowTrailerDropdown] = useState(false);
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [trailerSearchQuery, setTrailerSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedTruck(initialTruck);
      setSelectedTrailer(initialTrailer);
      setErrorMessage(null);
      setTruckSearchQuery('');
      setTrailerSearchQuery('');
    }
  }, [visible, initialTruck, initialTrailer]);

  const filteredTrucks = vehicleService.searchTrucks(
    serviceCenterName,
    truckSearchQuery,
  );
  const filteredTrailers = vehicleService.searchTrailers(trailerSearchQuery);

  const handleConfirm = useCallback(async () => {
    if (!selectedTruck) {
      setErrorMessage('Please select a truck to continue.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await onConfirm(selectedTruck, selectedTrailer);
    } catch {
      setErrorMessage('Failed to save vehicle selection. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [selectedTruck, selectedTrailer, onConfirm]);

  const renderTruckItem = ({item}: {item: Truck}) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedTruck?.id === item.id && styles.dropdownItemSelected,
      ]}
      onPress={() => {
        setSelectedTruck(item);
        setShowTruckDropdown(false);
        setTruckSearchQuery('');
        setErrorMessage(null);
      }}>
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
          onPress={() => {
            setSelectedTrailer(null);
            setShowTrailerDropdown(false);
            setTrailerSearchQuery('');
          }}>
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
        onPress={() => {
          setSelectedTrailer(item);
          setShowTrailerDropdown(false);
          setTrailerSearchQuery('');
        }}>
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (allowCancel) {
          onCancel?.();
        }
      }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={styles.header}>
            <Icon name="local-shipping" size={28} color={colors.primary} />
            <Text style={styles.title}>Select Your Vehicle</Text>
            <Text style={styles.subtitle}>
              Choose the truck and trailer you are operating today. This must be
              confirmed before starting service.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Truck *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
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
              <Icon
                name="keyboard-arrow-down"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Trailer</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
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
              <Icon
                name="keyboard-arrow-down"
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorBlock}>
              <Icon name="warning" size={24} color={colors.warning} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Continue"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => void handleConfirm()}
              loading={saving}
              disabled={saving || !selectedTruck}
            />
            {allowCancel && onCancel && (
              <Button
                title="Cancel"
                variant="outline"
                size="lg"
                fullWidth
                onPress={onCancel}
                disabled={saving}
              />
            )}
          </View>
        </ScrollView>

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>

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
              <Text style={styles.dropdownModalTitle}>Select Truck</Text>
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
                clearable
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
              <Text style={styles.dropdownModalTitle}>Select Trailer</Text>
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
                clearable
              />
            </View>
            <FlatList
              data={[null, ...filteredTrailers]}
              renderItem={renderTrailerItem}
              keyExtractor={(item, index) =>
                item ? item.id : `no-trailer-${index}`
              }
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    ...typography['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.sm,
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
    minHeight: 56,
  },
  dropdownButtonText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  dropdownButtonPlaceholder: {
    color: colors.mutedForeground,
  },
  errorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.sm,
    color: colors.foreground,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 56,
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
});
