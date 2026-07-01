import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../../components/Card';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../../styles/theme';
import {
  FlowStep,
  OrderData,
  WasteStream,
  ContainerType,
  AddedContainer,
} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {syncService} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {OfflineStatus} from '../../services/offlineTrackingService';
import {styles} from './styles';

/** Reason codes offered when a weight is entered manually (scale unavailable). */
const MANUAL_WEIGHT_REASONS: string[] = [
  'Scale not connected',
  'Scale malfunction',
  'Weight exceeds scale capacity',
  'Weight from certified truck scale',
  'Estimated weight',
  'Other',
];

export interface ContainerEntryScreenProps {
  // Order state
  selectedOrderData: OrderData | null;

  // Header props
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  setCurrentStep: (step: FlowStep) => void;
  elapsedTimeDisplay: string;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  handleRequestPause: () => void;
  handleResumeTracking: () => void;
  setShowJobNotesModal: (show: boolean) => void;
  validationState?: {state: 'none' | 'warning' | 'error'; count: number};
  setShowValidationModal: (show: boolean) => void;
  setShowServiceCenterModal: (show: boolean) => void;
  selectedTruck: {number: string; description?: string} | null;
  truckId: string;
  selectedTrailer: {number: string; description?: string} | null;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  handleManualSync: () => void;
  serviceTypeBadgesForHeader: Array<{
    serviceTypeId: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed' | 'noship';
  }>;
  isOrderCompleted: (orderNumber: string) => boolean;

  // Offline
  offlineStatus: OfflineStatus;
  setShowOfflineBlockedModal: (show: boolean) => void;

  // Container entry specific
  tareWeight: string;
  setTareWeight: (weight: string) => void;
  grossWeight: string;
  setGrossWeight: (weight: string) => void;
  scaleWeight: string;
  setScaleWeight: (weight: string) => void;
  barcode: string;
  setBarcode: (barcode: string) => void;
  unitCount: string;
  setUnitCount: (count: string) => void;
  isManualWeightEntry: boolean;
  setIsManualWeightEntry: (manual: boolean) => void;
  isScaleConnected: boolean;
  setIsScaleConnected: (connected: boolean) => void;
  scaleReading: number | null;
  setScaleReading: (reading: number | null) => void;
  selectedStream: string;
  selectedStreamCode: string;
  selectedStreamId: string;
  selectedContainerType: ContainerType | null;
  addedContainers: AddedContainer[];
  setAddedContainers: (
    containers: AddedContainer[] | ((prev: AddedContainer[]) => AddedContainer[]),
  ) => void;
  activeServiceTypeTimer: string | null;
  generateShippingLabelBarcode: (
    orderNumber: string,
    containerCount: number,
  ) => string;
  printShippingLabel: (container: any) => Promise<void>;
  setPrintingLabelBarcode: (barcode: string) => void;
  setShowLabelPrinting: (show: boolean) => void;
  wasteStreams: WasteStream[];
}

export const ContainerEntryScreen: React.FC<ContainerEntryScreenProps> = ({
  selectedOrderData,
  isOrderHeaderCollapsed,
  setIsOrderHeaderCollapsed,
  setCurrentStep,
  elapsedTimeDisplay,
  currentOrderTimeTracking,
  handleRequestPause,
  handleResumeTracking,
  setShowJobNotesModal,
  validationState,
  setShowValidationModal,
  setShowServiceCenterModal,
  selectedTruck,
  truckId,
  selectedTrailer,
  syncStatus,
  pendingSyncCount,
  handleManualSync,
  serviceTypeBadgesForHeader,
  isOrderCompleted,
  offlineStatus,
  setShowOfflineBlockedModal,
  tareWeight,
  setTareWeight,
  grossWeight,
  setGrossWeight,
  scaleWeight,
  setScaleWeight,
  barcode,
  setBarcode,
  unitCount,
  setUnitCount,
  isManualWeightEntry,
  setIsManualWeightEntry,
  isScaleConnected,
  setIsScaleConnected,
  scaleReading,
  setScaleReading,
  selectedStream,
  selectedStreamCode,
  selectedStreamId,
  selectedContainerType,
  addedContainers,
  setAddedContainers,
  activeServiceTypeTimer,
  generateShippingLabelBarcode,
  printShippingLabel,
  setPrintingLabelBarcode,
  setShowLabelPrinting,
  wasteStreams,
}) => {
  const parsedGrossWeight = parseInt(grossWeight || '0');
  const netWeight = parsedGrossWeight - parseInt(tareWeight || '0');

  const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
  const isCylinderProfile = currentStream?.requiresCylinderCount || false;
  const parsedUnitCount = parseInt(unitCount, 10);
  const hasValidUnitCount =
    unitCount.trim().length > 0 &&
    !Number.isNaN(parsedUnitCount) &&
    parsedUnitCount >= 1;
  const containersToAdd = isCylinderProfile ? 1 : parsedUnitCount;

  // Manual weight override: the scale field is read-only until the user opts
  // into manual entry and selects a reason code (e.g. scale unavailable).
  const [showManualReasonModal, setShowManualReasonModal] = useState(false);
  const [manualWeightReason, setManualWeightReason] = useState<string | null>(
    null,
  );

  const resetEntryForm = () => {
    setBarcode('');
    setUnitCount('1');
    setTareWeight('45');
    setGrossWeight('285');
    setScaleWeight('');
    setIsManualWeightEntry(false);
    setManualWeightReason(null);
    setShowManualReasonModal(false);
    if (isScaleConnected) {
      const capturedWeight = 285;
      setScaleReading(capturedWeight);
      setScaleWeight(capturedWeight.toString());
    } else {
      setScaleReading(null);
    }
  };

  // Toggle the manual-entry override. Turning it on prompts for a reason code
  // first; turning it off reverts to the live scale reading.
  const handleToggleManualEntry = () => {
    if (isCurrentOrderCompleted) return;
    if (isManualWeightEntry) {
      setIsManualWeightEntry(false);
      setManualWeightReason(null);
      if (isScaleConnected && scaleReading !== null) {
        setScaleWeight(scaleReading.toString());
      } else {
        setScaleWeight('');
      }
    } else {
      setShowManualReasonModal(true);
    }
  };

  const handleSelectManualReason = (reason: string) => {
    setManualWeightReason(reason);
    setIsManualWeightEntry(true);
    setShowManualReasonModal(false);
  };

  // Get weight limits from selected container type
  const getWeightLimits = () => {
    if (!selectedContainerType) {
      return {
        max: 400,
        softThreshold: 240,
        hardThreshold: 400,
      };
    }

    // Parse weight string like "400 lbs max" to get the number
    const weightMatch = selectedContainerType.weight.match(/(\d+)/);
    const maxWeight = weightMatch ? parseInt(weightMatch[1]) : 400;

    // Soft warning at 60% of max, hard warning at 100% of max
    return {
      max: maxWeight,
      softThreshold: Math.floor(maxWeight * 0.6),
      hardThreshold: maxWeight,
    };
  };

  const weightLimits = getWeightLimits();
  const showSoftWarning =
    parsedGrossWeight >= weightLimits.softThreshold &&
    parsedGrossWeight < weightLimits.hardThreshold;
  const showHardWarning = parsedGrossWeight >= weightLimits.hardThreshold;

  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  // Capture scale reading once when scale connects
  useEffect(() => {
    if (isScaleConnected) {
      // Simulate capturing a single scale reading when connected
      const capturedWeight = 285; // Simulated captured weight from scale
      setScaleReading(capturedWeight);
      setScaleWeight(capturedWeight.toString());
    } else {
      setScaleReading(null);
      setScaleWeight('');
    }
  }, [isScaleConnected]);

  // Keep gross weight in sync with the scale weight field (the scale reads
  // gross). This holds for both live scale readings and manual entry.
  useEffect(() => {
    if (scaleWeight && !isNaN(parseFloat(scaleWeight))) {
      setGrossWeight(scaleWeight);
    }
  }, [scaleWeight]);

  useEffect(() => {
    setUnitCount('1');
  }, [selectedContainerType?.id]);

  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() =>
          setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)
        }
        onBackPress={() => setCurrentStep('container-selection')}
        subtitle={`${selectedStream} • ${
          selectedContainerType?.size || 'Container'
        }`}
        elapsedTimeDisplay={
          elapsedTimeDisplay &&
          currentOrderTimeTracking &&
          selectedOrderData
            ? elapsedTimeDisplay
            : undefined
        }
        isPaused={Boolean(currentOrderTimeTracking?.pausedAt)}
        onPause={handleRequestPause}
        onResume={handleResumeTracking}
        onViewNotes={() => {
          setShowJobNotesModal(true);
        }}
        validationState={validationState}
        onViewValidation={() => setShowValidationModal(true)}
        onViewServiceCenter={() => setShowServiceCenterModal(true)}
        truckNumber={selectedTruck?.number || truckId || undefined}
        trailerNumber={selectedTrailer?.number || null}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        onSync={handleManualSync}
        serviceTypeBadges={serviceTypeBadgesForHeader}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={false}
        scrollEventThrottle={16}>
        <Card style={styles.unitCountCard}>
          <CardHeader>
            <CardTitle>
              <CardTitleText>Units</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              label="Number of Units"
              required
              value={unitCount}
              onChangeText={setUnitCount}
              keyboardType="numeric"
              placeholder="Enter unit count"
              editable={!isCurrentOrderCompleted}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <CardTitleText>Weight Information</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Net Weight Display - Most Prominent */}
            <View
              style={[
                styles.netWeightDisplayCard,
                showHardWarning && styles.netWeightDisplayCardHardWarning,
                showSoftWarning && styles.netWeightDisplayCardSoftWarning,
              ]}>
              <Text style={styles.netWeightDisplayLabel}>Gross Weight</Text>
              <View style={styles.netWeightDisplayValue}>
                <Text
                  style={[
                    styles.netWeightDisplayLargeValue,
                    showHardWarning &&
                      styles.netWeightDisplayLargeValueWarning,
                  ]}>
                  {parsedGrossWeight}
                </Text>
                <Text style={styles.netWeightDisplayUnit}>lbs</Text>
              </View>
              {showSoftWarning && (
                <View style={styles.inlineWarningSoft}>
                  <View style={styles.inlineWarningRow}>
                    <Icon
                      name="warning"
                      size={18}
                      color={colors.warning}
                      style={styles.inlineWarningIcon}
                    />
                    <Text style={styles.inlineWarningText}>
                      Approaching capacity (
                      {Math.round((parsedGrossWeight / weightLimits.max) * 100)}%
                      of {weightLimits.max} lbs)
                    </Text>
                  </View>
                </View>
              )}
              {showHardWarning && (
                <View style={styles.inlineWarningHard}>
                  <View style={styles.inlineWarningRow}>
                    <Icon
                      name="warning"
                      size={18}
                      color={colors.destructive}
                      style={styles.inlineWarningIcon}
                    />
                    <Text style={styles.inlineWarningText}>
                      EXCEEDS MAXIMUM ({parsedGrossWeight} lbs /{' '}
                      {weightLimits.max} lbs max) - Must consolidate or use new
                      container
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Compact Weight Info Row */}
            <View style={styles.compactWeightRow}>
              <View style={styles.compactWeightItem}>
                <Text style={styles.compactWeightLabel}>Tare Weight</Text>
                <Text style={styles.compactWeightValue}>{tareWeight}</Text>
                <Text style={styles.compactWeightUnit}>lbs</Text>
              </View>
              <View style={styles.compactWeightDivider} />
              <View style={styles.compactWeightItem}>
                <Text style={styles.compactWeightLabel}>Scale Weight</Text>
                <Input
                  value={scaleWeight}
                  onChangeText={setScaleWeight}
                  keyboardType="numeric"
                  editable={isManualWeightEntry && !isCurrentOrderCompleted}
                  placeholder="---"
                  style={[
                    styles.compactScaleInput,
                    !isManualWeightEntry && localStyles.readOnlyInput,
                  ]}
                  containerStyle={styles.compactScaleInputContainer}
                />
                <Text style={styles.compactWeightUnit}>lbs (Gross)</Text>
                <View style={localStyles.scaleStatusRow}>
                  <View
                    style={[
                      styles.compactScaleLight,
                      isScaleConnected
                        ? styles.compactScaleLightOnline
                        : styles.compactScaleLightOffline,
                    ]}
                  />
                  <Text
                    style={[
                      localStyles.scaleStatusLabel,
                      isScaleConnected
                        ? localStyles.scaleStatusLabelOnline
                        : localStyles.scaleStatusLabelOffline,
                    ]}>
                    {isScaleConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
              </View>
              <View style={styles.compactWeightDivider} />
              <View style={styles.compactWeightItem}>
                <Text style={styles.compactWeightLabel}>Net Weight</Text>
                <Text
                  style={[
                    styles.compactWeightValue,
                    styles.compactWeightValueNet,
                  ]}>
                  {netWeight}
                </Text>
                <Text style={styles.compactWeightUnit}>lbs (Waste)</Text>
              </View>
            </View>

            {/* Manual weight override */}
            <TouchableOpacity
              style={localStyles.manualToggleRow}
              onPress={handleToggleManualEntry}
              disabled={isCurrentOrderCompleted}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{checked: isManualWeightEntry}}>
              <View
                style={[
                  localStyles.checkbox,
                  isManualWeightEntry && localStyles.checkboxChecked,
                ]}>
                {isManualWeightEntry && (
                  <Icon name="check" size={18} color={colors.primaryForeground} />
                )}
              </View>
              <View style={localStyles.manualToggleTextGroup}>
                <Text style={localStyles.manualToggleLabel}>
                  Enter weight manually
                </Text>
                <Text style={localStyles.manualToggleHint}>
                  Use when the scale is unavailable or disconnected.
                </Text>
              </View>
            </TouchableOpacity>

            {isManualWeightEntry && (
              <TouchableOpacity
                style={localStyles.reasonRow}
                onPress={() => setShowManualReasonModal(true)}
                disabled={isCurrentOrderCompleted}
                activeOpacity={0.7}>
                <Icon
                  name="warning"
                  size={18}
                  color={colors.warning}
                  style={localStyles.reasonIcon}
                />
                <View style={localStyles.reasonTextGroup}>
                  <Text style={localStyles.reasonLabel}>
                    Manual entry reason
                  </Text>
                  <Text
                    style={[
                      localStyles.reasonValue,
                      !manualWeightReason && localStyles.reasonValuePlaceholder,
                    ]}>
                    {manualWeightReason || 'Tap to select a reason'}
                  </Text>
                </View>
                <Icon
                  name="keyboard-arrow-down"
                  size={22}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Manual weight reason picker */}
      <Modal
        visible={showManualReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualReasonModal(false)}>
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>
                Reason for Manual Entry
              </Text>
              <TouchableOpacity
                onPress={() => setShowManualReasonModal(false)}
                style={localStyles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Icon name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={localStyles.modalSubtitle}>
              Select why you are entering this weight without a live scale
              reading.
            </Text>
            <ScrollView>
              {MANUAL_WEIGHT_REASONS.map(reason => {
                const isSelected = manualWeightReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={localStyles.reasonOption}
                    onPress={() => handleSelectManualReason(reason)}
                    activeOpacity={0.7}>
                    <Text style={localStyles.reasonOptionText}>{reason}</Text>
                    {isSelected && (
                      <Icon name="check" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          size="md"
          onPress={() => {
            setIsManualWeightEntry(false);
            setCurrentStep('container-selection');
          }}
        />
        <Button
          title={
            containersToAdd > 1
              ? `Add ${containersToAdd} Containers`
              : 'Add Container'
          }
          variant="primary"
          size="md"
          disabled={
            isCurrentOrderCompleted ||
            offlineStatus.isBlocked ||
            !hasValidUnitCount
          }
          onPress={async () => {
            if (
              selectedContainerType &&
              selectedStream &&
              !isCurrentOrderCompleted
            ) {
              // Check if blocked due to offline limit
              if (offlineStatus.isBlocked) {
                setShowOfflineBlockedModal(true);
                return;
              }

              if (!hasValidUnitCount) {
                Alert.alert(
                  'Required Field',
                  'Please enter a valid unit count before adding containers.',
                );
                return;
              }

              if (isManualWeightEntry && !manualWeightReason) {
                setShowManualReasonModal(true);
                return;
              }

              const containerNetWeight =
                parseInt(grossWeight || '0') - parseInt(tareWeight || '0');

              const orderNumber =
                selectedOrderData?.orderNumber || 'WO-2024-0000';
              const highestExistingSequence = addedContainers.reduce(
                (max, c) => {
                  const match = c.shippingLabelBarcode?.match(/-(\d+)$/);
                  const seq = match ? parseInt(match[1], 10) : 0;
                  return seq > max ? seq : max;
                },
                0,
              );

              const wasteCodes =
                currentStream?.wasteCodes && currentStream.wasteCodes.length > 0
                  ? currentStream.wasteCodes
                  : currentStream?.id
                    ? [currentStream.id]
                    : [];

              const baseTimestamp = Date.now();
              const newContainers: AddedContainer[] = [];

              for (let i = 0; i < containersToAdd; i++) {
                const shippingLabelBarcode = generateShippingLabelBarcode(
                  orderNumber,
                  highestExistingSequence + i,
                );

                newContainers.push({
                  id: `container-${baseTimestamp}-${i}`,
                  streamName: selectedStream,
                  streamCode: selectedStreamCode,
                  wasteCodes,
                  containerType: selectedContainerType.code,
                  containerSize: selectedContainerType.size,
                  barcode:
                    i === 0 && barcode
                      ? barcode
                      : `AUTO-${baseTimestamp}-${i}`,
                  tareWeight,
                  grossWeight,
                  netWeight: containerNetWeight,
                  isManualEntry: isManualWeightEntry,
                  ...(isManualWeightEntry && manualWeightReason
                    ? {manualWeightReason}
                    : {}),
                  shippingLabelBarcode,
                  status: 'loaded' as const,
                  serviceTypeId: activeServiceTypeTimer ?? undefined,
                  orderNumber,
                  ...(isCylinderProfile ? {unitCount: parsedUnitCount} : {}),
                });
              }

              setAddedContainers(prev => [...prev, ...newContainers]);

              for (const container of newContainers) {
                await syncService.addPendingOperation('container', container);
              }

              for (const container of newContainers) {
                setPrintingLabelBarcode(container.shippingLabelBarcode ?? '');
                setShowLabelPrinting(true);
                await printShippingLabel(container);
              }

              setTimeout(() => {
                setShowLabelPrinting(false);
                setPrintingLabelBarcode('');
              }, 3000);

              resetEntryForm();
              setCurrentStep('container-summary');
            }
          }}
        />
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  scaleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scaleStatusLabel: {
    ...typography.xs,
    fontWeight: '700',
  },
  scaleStatusLabelOnline: {
    color: colors.success,
  },
  scaleStatusLabelOffline: {
    color: colors.destructive,
  },
  readOnlyInput: {
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
  },
  manualToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  manualToggleTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  manualToggleLabel: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  manualToggleHint: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.warning,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.warning}12`,
  },
  reasonIcon: {
    marginRight: spacing.sm,
  },
  reasonTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  reasonLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  reasonValue: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  reasonValuePlaceholder: {
    color: colors.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  modalCloseBtn: {
    width: touchTargets.min,
    height: touchTargets.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: touchTargets.comfortable,
  },
  reasonOptionText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
});
