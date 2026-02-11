import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import {Button} from './Button';
import {Icon} from './Icon';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';

export interface ActiveContainerItem {
  id: string;
  netWeight: number;
  label?: string;
}

interface DropWasteModalProps {
  visible: boolean;
  onClose: () => void;
  /** FR-3a.EXT.3.3: Called with selected container IDs; parent performs status transition and aggregation update. */
  onConfirm: (
    transferLocation: string,
    dropDate: string,
    dropTime: string,
    selectedContainerIds: string[],
  ) => void;
  /** FR-3a.EXT.3.2: All active (Loaded/In-Transit) containers on the truck. */
  activeContainers: ActiveContainerItem[];
  /** FR-3a.EXT.3.1: Default = Technician's assigned Service Center (Section 3.9). */
  defaultTransferLocation: string;
  /** Approved facilities for override (default first). */
  transferLocationOptions: string[];
}

const DropWasteModal: React.FC<DropWasteModalProps> = ({
  visible,
  onClose,
  onConfirm,
  activeContainers,
  defaultTransferLocation,
  transferLocationOptions,
}) => {
  const [transferLocation, setTransferLocation] = useState<string>('');
  const [dropDate, setDropDate] = useState<string>('');
  const [dropTime, setDropTime] = useState<string>('');
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  /** FR-3a.EXT.3.2: All selected by default; user can deselect for partial drop. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (justOpened) {
      setTransferLocation(defaultTransferLocation || '');
      const now = new Date();
      setDropDate(now.toISOString().split('T')[0]);
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setDropTime(`${hours}:${minutes}`);
      setSelectedIds(new Set(activeContainers.map(c => c.id)));
    }
  }, [visible, defaultTransferLocation, activeContainers]);

  const handleClose = () => {
    setTransferLocation('');
    setDropDate('');
    setDropTime('');
    setShowLocationPicker(false);
    setSelectedIds(new Set());
    onClose();
  };

  const handleLocationSelect = (location: string) => {
    setTransferLocation(location);
    setShowLocationPicker(false);
  };

  const toggleContainer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(activeContainers.map(c => c.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleConfirm = () => {
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
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      Alert.alert('No Containers Selected', 'Select at least one container to drop, or cancel.');
      return;
    }
    onConfirm(transferLocation, dropDate, dropTime, ids);
    handleClose();
  };

  const selectedCount = selectedIds.size;
  const selectedWeight = activeContainers
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.netWeight, 0);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Record Drop</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}>
            <Icon name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}>
          {/* FR-3a.EXT.3.1: Transfer Location dropdown, smart default */}
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
              <Icon name="keyboard-arrow-down" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* FR-3a.EXT.3.2: List active containers; all selected by default; partial drop by deselecting */}
          <View style={styles.formField}>
            <View style={styles.containerListHeader}>
              <Text style={styles.formLabel}>Containers on truck</Text>
              <View style={styles.selectAllRow}>
                <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
                  <Text style={styles.selectAllText}>Select all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deselectAll} style={styles.selectAllBtn}>
                  <Text style={styles.selectAllText}>Deselect all</Text>
                </TouchableOpacity>
              </View>
            </View>
            {activeContainers.length === 0 ? (
              <Text style={styles.emptyContainersText}>No active containers on truck.</Text>
            ) : (
              <View style={styles.containerList}>
                {activeContainers.map(c => {
                  const isSelected = selectedIds.has(c.id);
                  const label = c.label || `Container ${c.id.slice(-6)}`;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.containerRow}
                      onPress={() => toggleContainer(c.id)}
                      activeOpacity={0.7}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && (
                          <Icon name="check" size={16} color={colors.primaryForeground} />
                        )}
                      </View>
                      <View style={styles.containerRowContent}>
                        <Text style={styles.containerLabel}>{label}</Text>
                        <Text style={styles.containerWeight}>{c.netWeight} lbs</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Drop Date *</Text>
            <TextInput
              style={styles.input}
              value={dropDate}
              onChangeText={setDropDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Drop Time *</Text>
            <TextInput
              style={styles.input}
              value={dropTime}
              onChangeText={setDropTime}
              placeholder="HH:MM (24-hour)"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              Containers to drop: {selectedCount}
            </Text>
            <Text style={styles.summaryText}>
              Total weight: {selectedWeight.toLocaleString()} lbs
            </Text>
          </View>
        </ScrollView>

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
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={transferLocationOptions}
                keyExtractor={(item, index) => `location-${index}`}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.locationItem}
                    onPress={() => handleLocationSelect(item)}>
                    <Text style={styles.locationItemText}>{item}</Text>
                    {transferLocation === item && (
                      <Icon name="check" size={20} color={colors.primary} />
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
            title="Confirm Drop"
            variant="primary"
            size="md"
            onPress={handleConfirm}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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
  containerListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectAllRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectAllBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  selectAllText: {
    ...typography.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyContainersText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  containerList: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  containerRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerLabel: {
    ...typography.base,
    color: colors.foreground,
  },
  containerWeight: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
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
});

export default DropWasteModal;
