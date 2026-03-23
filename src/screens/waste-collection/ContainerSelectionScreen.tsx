import React from 'react';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {Badge} from '../../components/Badge';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
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
  setSelectedContainerType: (type: ContainerType | null) => void;
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
  setSelectedContainerType,
}) => {
  const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
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
            {filteredContainers.map((container, i) => (
              <TouchableOpacity
                key={i}
                style={styles.containerCard}
                onPress={() => {
                  if (!isCurrentOrderCompleted) {
                    setSelectedContainerType(container);
                    setCurrentStep('container-entry');
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
            ))}
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
    </View>
  );
};
