import React, {useEffect} from 'react';
import {View, Text, ScrollView, Alert} from 'react-native';
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
import {colors} from '../../styles/theme';
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
  cylinderCount: string;
  setCylinderCount: (count: string) => void;
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
  cylinderCount,
  setCylinderCount,
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
  const netWeight =
    parseInt(grossWeight || '0') - parseInt(tareWeight || '0');

  // Check if current stream requires cylinder count
  const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
  const requiresCylinderCount = currentStream?.requiresCylinderCount || false;

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
    netWeight >= weightLimits.softThreshold &&
    netWeight < weightLimits.hardThreshold;
  const showHardWarning = netWeight >= weightLimits.hardThreshold;

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

  // When scale weight changes, update gross weight
  useEffect(() => {
    if (scaleWeight && !isNaN(parseFloat(scaleWeight))) {
      setGrossWeight(scaleWeight);
      setIsManualWeightEntry(false);
    }
  }, [scaleWeight]);

  // Handle manual weight entry
  const handleManualWeightChange = (
    field: 'tare' | 'gross',
    value: string,
  ) => {
    if (field === 'tare') {
      setTareWeight(value);
    } else {
      setGrossWeight(value);
    }
    setIsManualWeightEntry(true);
  };

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
        {/* Cylinder Count Input - Only shown for profiles that require it */}
        {requiresCylinderCount && (
          <Card style={styles.cylinderCountCard}>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Cylinder Count</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Number of Cylinders *"
                value={cylinderCount}
                onChangeText={setCylinderCount}
                keyboardType="numeric"
                placeholder="Enter cylinder count"
                editable={!isCurrentOrderCompleted}
              />
            </CardContent>
          </Card>
        )}

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
              <Text style={styles.netWeightDisplayLabel}>
                Net Weight (Waste Only)
              </Text>
              <View style={styles.netWeightDisplayValue}>
                <Text
                  style={[
                    styles.netWeightDisplayLargeValue,
                    showHardWarning &&
                      styles.netWeightDisplayLargeValueWarning,
                  ]}>
                  {netWeight}
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
                      {Math.round((netWeight / weightLimits.max) * 100)}% of{' '}
                      {weightLimits.max} lbs)
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
                      EXCEEDS MAXIMUM ({netWeight} lbs / {weightLimits.max}{' '}
                      lbs max) - Must consolidate or use new container
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
                <View style={styles.compactScaleHeader}>
                  <Text style={styles.compactWeightLabel}>Scale Weight</Text>
                  <View style={styles.compactScaleStatus}>
                    <View
                      style={[
                        styles.compactScaleLight,
                        isScaleConnected
                          ? styles.compactScaleLightOnline
                          : styles.compactScaleLightOffline,
                      ]}
                    />
                  </View>
                </View>
                {isScaleConnected && scaleReading !== null ? (
                  <Text style={styles.compactWeightValue}>
                    {scaleReading}
                  </Text>
                ) : (
                  <Text style={styles.compactWeightValueOffline}>---</Text>
                )}
                <Input
                  value={scaleWeight}
                  onChangeText={setScaleWeight}
                  keyboardType="numeric"
                  editable={!isCurrentOrderCompleted}
                  style={styles.compactScaleInput}
                  containerStyle={styles.compactScaleInputContainer}
                />
                <Text style={styles.compactWeightUnit}>lbs (Gross)</Text>
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

            {/* Manual Entry Indicator */}
            {isManualWeightEntry && (
              <View style={styles.manualEntryIndicator}>
                <View style={styles.manualWeightRow}>
                  <Icon
                    name="warning"
                    size={16}
                    color={colors.warning}
                    style={styles.manualWeightIcon}
                  />
                  <Text style={styles.manualEntryText}>
                    Weight entered manually
                  </Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

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
          title="Add Container"
          variant="primary"
          size="md"
          disabled={isCurrentOrderCompleted || offlineStatus.isBlocked}
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

              // Validate cylinder count if required
              if (
                requiresCylinderCount &&
                (!cylinderCount || cylinderCount.trim() === '')
              ) {
                Alert.alert(
                  'Required Field',
                  'Please enter the cylinder count before adding the container.',
                );
                return;
              }

              // Check if blocked due to offline limit
              if (offlineStatus.isBlocked) {
                setShowOfflineBlockedModal(true);
                return;
              }

              const netWeight =
                parseInt(grossWeight || '0') - parseInt(tareWeight || '0');

              // Get current container count for this order to generate sequential barcode
              const currentContainerCount = addedContainers.length;
              const orderNumber =
                selectedOrderData?.orderNumber || 'WO-2024-0000';
              const shippingLabelBarcode = generateShippingLabelBarcode(
                orderNumber,
                currentContainerCount,
              );

              const newContainer = {
                id: `container-${Date.now()}`,
                streamName: selectedStream,
                streamCode: selectedStreamCode,
                containerType: selectedContainerType.code,
                containerSize: selectedContainerType.size,
                barcode: barcode || `AUTO-${Date.now()}`,
                tareWeight,
                grossWeight,
                netWeight,
                isManualEntry: isManualWeightEntry,
                shippingLabelBarcode,
                status: 'loaded' as const,
                serviceTypeId: activeServiceTypeTimer ?? undefined,
                orderNumber,
                ...(requiresCylinderCount && cylinderCount
                  ? {cylinderCount: parseInt(cylinderCount) || 0}
                  : {}),
              };

              setAddedContainers(prev => [...prev, newContainer]);

              // Queue for sync
              await syncService.addPendingOperation(
                'container',
                newContainer,
              );

              // Show label printing notification
              setPrintingLabelBarcode(shippingLabelBarcode);
              setShowLabelPrinting(true);

              // Auto-print shipping label
              await printShippingLabel(newContainer);

              // Hide notification after 3 seconds
              setTimeout(() => {
                setShowLabelPrinting(false);
                setPrintingLabelBarcode('');
              }, 3000);

              // Reset form
              setBarcode('');
              setTareWeight('45');
              setGrossWeight('285');
              setCylinderCount('');
              setIsManualWeightEntry(false);
              setCurrentStep('container-summary');
            }
          }}
        />
      </View>
    </View>
  );
};
