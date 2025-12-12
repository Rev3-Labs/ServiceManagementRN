import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from './Button';

// Conditionally import DateTimePicker only for native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';

interface DropWasteModalProps {
  visible: boolean;
  onClose: () => void;
  onDropWaste: (
    transferLocation: string,
    dropDate: string,
    dropTime: string,
  ) => void;
  truckId: string;
  completedOrdersCount: number;
  containersToDropCount: number;
}

// Mock locations list
const MOCK_LOCATIONS = [
  'Main Transfer Station - Downtown',
  'Northside Waste Facility',
  'Southside Recycling Center',
  'East End Transfer Point',
  'West Industrial Waste Hub',
  'Central Processing Facility',
  'Riverside Drop-Off Site',
  'Highway 101 Transfer Station',
  'Airport Road Waste Center',
  'Port Authority Facility',
  'Mountain View Disposal Site',
  'Valley Waste Management',
  'Coastal Transfer Station',
  'Inland Processing Center',
  'Metro Waste Facility',
  'Suburban Drop Point',
  'Urban Collection Center',
  'Regional Transfer Hub',
  'City Main Facility',
  'Industrial Park Station',
];

const DropWasteModal: React.FC<DropWasteModalProps> = ({
  visible,
  onClose,
  onDropWaste,
  truckId,
  completedOrdersCount,
  containersToDropCount,
}) => {
  const [transferLocation, setTransferLocation] = useState<string>('');
  const [dropDate, setDropDate] = useState<string>('');
  const [dropTime, setDropTime] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  const handleClose = () => {
    setTransferLocation('');
    setDropDate('');
    setDropTime('');
    setShowLocationPicker(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    onClose();
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setDropDate(date.toISOString().split('T')[0]);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (time) {
      setSelectedTime(time);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setDropTime(`${hours}:${minutes}`);
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  const handleLocationSelect = (location: string) => {
    setTransferLocation(location);
    setShowLocationPicker(false);
  };

  const handleDrop = () => {
    if (!transferLocation.trim()) {
      Alert.alert('Required Field', 'Please select a transfer location.');
      return;
    }
    if (!dropDate) {
      Alert.alert('Required Field', 'Please select a drop date.');
      return;
    }
    if (!dropTime) {
      Alert.alert('Required Field', 'Please select a drop time.');
      return;
    }

    onDropWaste(transferLocation, dropDate, dropTime);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Drop Waste</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}>
          <Text style={styles.description}>
            Mark all completed orders for truck {truckId} as dropped at the
            transfer location.
          </Text>

          {/* Transfer Location Dropdown */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Transfer Location *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowLocationPicker(true)}>
              <Text
                style={[
                  styles.dropdownText,
                  !transferLocation && styles.dropdownPlaceholder,
                ]}>
                {transferLocation || 'Select transfer location'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Drop Date */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Drop Date *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={dropDate}
                onChange={(e: any) => {
                  const value = e.target?.value || '';
                  setDropDate(value);
                  if (value) {
                    setSelectedDate(new Date(value));
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  minHeight: `${touchTargets.comfortable}px`,
                  paddingLeft: `${spacing.md}px`,
                  paddingRight: `${spacing.md}px`,
                  paddingTop: `${spacing.sm}px`,
                  paddingBottom: `${spacing.sm}px`,
                  backgroundColor: colors.card,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: colors.border,
                  borderRadius: `${borderRadius.md}px`,
                  color: colors.foreground,
                  fontSize: `${typography.base.fontSize}px`,
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}>
                  <Text
                    style={[
                      styles.inputText,
                      !dropDate && styles.inputPlaceholder,
                    ]}>
                    {dropDate
                      ? new Date(dropDate).toLocaleDateString()
                      : 'Select drop date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          {/* Drop Time */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Drop Time *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={dropTime}
                onChange={(e: any) => {
                  const value = e.target?.value || '';
                  setDropTime(value);
                  if (value) {
                    const [hours, minutes] = value.split(':');
                    const time = new Date();
                    time.setHours(parseInt(hours, 10));
                    time.setMinutes(parseInt(minutes, 10));
                    setSelectedTime(time);
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: `${touchTargets.comfortable}px`,
                  paddingLeft: `${spacing.md}px`,
                  paddingRight: `${spacing.md}px`,
                  paddingTop: `${spacing.sm}px`,
                  paddingBottom: `${spacing.sm}px`,
                  backgroundColor: colors.card,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: colors.border,
                  borderRadius: `${borderRadius.md}px`,
                  color: colors.foreground,
                  fontSize: `${typography.base.fontSize}px`,
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowTimePicker(true)}>
                  <Text
                    style={[
                      styles.inputText,
                      !dropTime && styles.inputPlaceholder,
                    ]}>
                    {dropTime || 'Select drop time'}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && DateTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    is24Hour={false}
                  />
                )}
              </>
            )}
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              Completed Orders: {completedOrdersCount}
            </Text>
            <Text style={styles.summaryText}>
              Containers to Drop: {containersToDropCount}
            </Text>
          </View>
        </ScrollView>

        {/* Location Picker Modal */}
        <Modal
          visible={showLocationPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLocationPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Transfer Location</Text>
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(false)}
                  style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={MOCK_LOCATIONS}
                keyExtractor={(item, index) => `location-${index}`}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.locationItem}
                    onPress={() => handleLocationSelect(item)}>
                    <Text style={styles.locationItemText}>{item}</Text>
                    {transferLocation === item && (
                      <Text style={styles.locationItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.locationList}
              />
            </View>
          </View>
        </Modal>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            onPress={handleClose}
            style={styles.button}
          />
          <Button
            title="Drop Waste"
            variant="primary"
            size="md"
            onPress={handleDrop}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  closeBtn: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    ...typography.xl,
    color: colors.foreground,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.sm,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTargets.comfortable,
  },
  dropdownText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.mutedForeground,
  },
  dropdownArrow: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginLeft: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
  },
  inputText: {
    ...typography.base,
    color: colors.foreground,
  },
  inputPlaceholder: {
    color: colors.mutedForeground,
  },
  summary: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryTitle: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  summaryText: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  modalCloseBtn: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    ...typography.xl,
    color: colors.foreground,
    fontWeight: '600',
  },
  locationList: {
    maxHeight: 400,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationItemText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  locationItemCheck: {
    ...typography.base,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
});

export default DropWasteModal;

