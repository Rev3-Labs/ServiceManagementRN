import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {Badge} from '../../components/Badge';
import {Button} from '../../components/Button';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {colors} from '../../styles/theme';
import {FlowStep, OrderData, WasteStream, ContainerType} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {styles} from './styles';

export interface ContainerSelectionScreenProps {
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

  // Container selection specific
  selectedStreamId: string;
  wasteStreams: WasteStream[];
  allContainerTypes: ContainerType[];
  selectedStream: string;
  selectedContainerType: ContainerType | null;
  setSelectedContainerType: (type: ContainerType | null) => void;
  unitCount: string;
  setUnitCount: (count: string) => void;
  onBeginContainerEntry: () => void;
}

export const ContainerSelectionScreen: React.FC<ContainerSelectionScreenProps> = ({
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
  selectedStreamId,
  wasteStreams,
  allContainerTypes,
  selectedStream,
  selectedContainerType,
  setSelectedContainerType,
  unitCount,
  setUnitCount,
  onBeginContainerEntry,
}) => {
  const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
  const isCylinderProfile = currentStream?.requiresCylinderCount || false;
  const parsedUnitCount = parseInt(unitCount, 10);
  const hasValidUnitCount =
    unitCount.trim().length > 0 &&
    !Number.isNaN(parsedUnitCount) &&
    parsedUnitCount >= 1;

  // Only allow positive whole numbers; strip anything else (including a
  // leading minus sign or leading zeros) so a value of 0 or below is
  // impossible to enter.
  const handleUnitCountChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '').replace(/^0+/, '');
    setUnitCount(digitsOnly);
  };
  const decrementUnitCount = () => {
    const current = Number.isNaN(parsedUnitCount) ? 1 : parsedUnitCount;
    setUnitCount(String(Math.max(1, current - 1)));
  };
  const incrementUnitCount = () => {
    const current = Number.isNaN(parsedUnitCount) ? 0 : parsedUnitCount;
    setUnitCount(String(Math.max(1, current + 1)));
  };
  const allowedContainerIds = currentStream?.allowedContainers || [];
  const filteredContainers = allContainerTypes.filter(c =>
    allowedContainerIds.includes(c.id),
  );
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() =>
          setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)
        }
        onBackPress={() => setCurrentStep('stream-selection')}
        subtitle={selectedStream}
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
        removeClippedSubviews={false}>
        {filteredContainers.length > 0 ? (
          <View style={styles.containersGrid}>
            {filteredContainers.map((container, i) => {
              const isSelected = selectedContainerType?.id === container.id;
              return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.containerCard,
                  isSelected && styles.containerCardSelected,
                ]}
                onPress={() => {
                  if (!isCurrentOrderCompleted) {
                    setSelectedContainerType(container);
                    setUnitCount('1');
                  }
                }}
                disabled={isCurrentOrderCompleted}
                activeOpacity={isCurrentOrderCompleted ? 1 : 0.7}>
                {container.popular && (
                  <Badge variant="default" style={styles.popularBadge}>
                    Popular
                  </Badge>
                )}
                <Text style={styles.containerCardCode}>{container.code}</Text>
                <Text style={styles.containerCardTitle}>
                  {container.size}
                </Text>
                <Text style={styles.containerCardInfo}>
                  {container.capacity}
                </Text>
                <Text style={styles.containerCardInfo}>
                  {container.weight}
                </Text>
              </TouchableOpacity>
            );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              No Containers Available
            </Text>
            <Text style={styles.emptyStateText}>
              No container types are configured for this waste stream profile.
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedContainerType ? (
        <View style={styles.unitCountFooter}>
          <View style={styles.unitCountPromptRow}>
            <View style={styles.unitCountPromptTextGroup}>
              <Text style={styles.unitCountPromptLabel}>
                {isCylinderProfile ? 'Number of Cylinders' : 'Number of Units'}
              </Text>
              <Text style={styles.unitCountPromptHint}>
                {isCylinderProfile
                  ? 'Cylinders in this single container.'
                  : 'One shipping label & weight per unit.'}
              </Text>
            </View>
            <View style={styles.unitCountStepper}>
              <TouchableOpacity
                style={[
                  styles.unitCountStepperButton,
                  (isCurrentOrderCompleted || parsedUnitCount <= 1) &&
                    styles.unitCountStepperButtonDisabled,
                ]}
                onPress={decrementUnitCount}
                disabled={isCurrentOrderCompleted || parsedUnitCount <= 1}
                accessibilityRole="button"
                accessibilityLabel="Decrease unit count">
                <Icon name="remove" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.unitCountStepperInput}
                value={unitCount}
                onChangeText={handleUnitCountChange}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                editable={!isCurrentOrderCompleted}
                accessibilityLabel="Unit count"
              />
              <TouchableOpacity
                style={[
                  styles.unitCountStepperButton,
                  isCurrentOrderCompleted &&
                    styles.unitCountStepperButtonDisabled,
                ]}
                onPress={incrementUnitCount}
                disabled={isCurrentOrderCompleted}
                accessibilityRole="button"
                accessibilityLabel="Increase unit count">
                <Icon name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Button
            title="Continue"
            variant="primary"
            size="md"
            fullWidth
            disabled={isCurrentOrderCompleted || !hasValidUnitCount}
            onPress={() => {
              if (!hasValidUnitCount) {
                Alert.alert(
                  'Required Field',
                  'Please enter a valid unit count.',
                );
                return;
              }
              onBeginContainerEntry();
              setCurrentStep('container-entry');
            }}
          />
        </View>
      ) : null}
    </View>
  );
};
