import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {Button} from '../../components/Button';
import {Card} from '../../components/Card';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {FlowStep, OrderData, AddedContainer} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {serviceTypeService} from '../../services/serviceTypeService';
import {styles} from './styles';

export interface ContainerSummaryScreenProps {
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

  // Container summary specific
  activeContainers: AddedContainer[];
  activeServiceTypeTimer: string | null;
  hasManifestForOrder: (orderNumber: string) => boolean;
  isOrderReadyForManifest: (order: OrderData) => boolean;
  printShippingLabel: (container: any) => Promise<void>;
  setAddedContainers: (
    containers: AddedContainer[] | ((prev: AddedContainer[]) => AddedContainer[]),
  ) => void;
  handleMarkServiceTypeComplete: () => void;
  returnToContainersReviewAfterAdd: boolean;
  setReturnToContainersReviewAfterAdd: (value: boolean) => void;
}

export const ContainerSummaryScreen: React.FC<ContainerSummaryScreenProps> = ({
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
  activeContainers,
  activeServiceTypeTimer,
  hasManifestForOrder,
  isOrderReadyForManifest,
  printShippingLabel,
  setAddedContainers,
  handleMarkServiceTypeComplete,
  returnToContainersReviewAfterAdd,
  setReturnToContainersReviewAfterAdd,
}) => {
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;
  const manifestGenerated = selectedOrderData
    ? hasManifestForOrder(selectedOrderData.orderNumber)
    : false;
  const canEditContainers = !manifestGenerated && !isCurrentOrderCompleted;

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    visible: boolean;
    containerId: string | null;
    containerIndex: number | null;
  }>({
    visible: false,
    containerId: null,
    containerIndex: null,
  });
  const [deleteBarcodeInput, setDeleteBarcodeInput] = useState('');

  const containerToDelete = deleteConfirmation.containerId
    ? activeContainers.find(c => c.id === deleteConfirmation.containerId)
    : null;
  const expectedBarcode = (
    containerToDelete?.shippingLabelBarcode ||
    containerToDelete?.barcode ||
    ''
  ).trim();
  const isBarcodeMatch =
    expectedBarcode.length > 0 &&
    deleteBarcodeInput.trim() === expectedBarcode;

  const handleDeleteContainer = (
    containerId: string,
    containerIndex: number,
  ) => {
    setDeleteBarcodeInput('');
    setDeleteConfirmation({
      visible: true,
      containerId,
      containerIndex,
    });
  };

  const handleConfirmDelete = () => {
    if (!isBarcodeMatch) return;
    if (deleteConfirmation.containerId) {
      setAddedContainers(prev =>
        prev.filter(
          container => container.id !== deleteConfirmation.containerId,
        ),
      );
    }
    setDeleteBarcodeInput('');
    setDeleteConfirmation({
      visible: false,
      containerId: null,
      containerIndex: null,
    });
  };

  const handleCancelDelete = () => {
    setDeleteBarcodeInput('');
    setDeleteConfirmation({
      visible: false,
      containerId: null,
      containerIndex: null,
    });
  };

  const renderRightActions = (
    containerId: string,
    containerIndex: number,
  ) => {
    return (
      <View style={styles.swipeDeleteContainer}>
        <TouchableOpacity
          style={styles.swipeDeleteButton}
          onPress={() => handleDeleteContainer(containerId, containerIndex)}
          activeOpacity={0.8}>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
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
        onBackPress={() => setCurrentStep('container-entry')}
        subtitle="Container Summary"
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

      <View style={styles.scrollViewContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <Text style={styles.summaryText}>
            Showing {activeContainers.length} container
            {activeContainers.length !== 1 ? 's' : ''} for this order
          </Text>

          {activeContainers.length > 0 ? (
            activeContainers.map((container, index) => (
              <View key={container.id}>
                <Card style={styles.containerSummaryCard}>
                  <View style={styles.containerSummaryHeader}>
                    <View style={styles.containerSummaryHeaderLeft}>
                      <Text style={styles.containerSummaryNumber}>
                        #{index + 1}
                      </Text>
                      <View style={styles.containerSummaryTitleGroup}>
                        <Text style={styles.containerSummaryTitle}>
                          {container.streamName}
                        </Text>
                        <Text style={styles.containerSummarySubtitle}>
                          {container.containerSize} •{' '}
                          {container.containerType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.containerSummaryNetWeight}>
                      <Text style={styles.containerSummaryNetWeightLabel}>
                        Net
                      </Text>
                      <Text
                        style={[
                          styles.containerSummaryNetWeightValue,
                          styles.netWeightHighlight,
                        ]}>
                        {container.netWeight} lbs
                      </Text>
                    </View>
                  </View>
                  <View style={styles.containerSummaryBody}>
                    {/* Reference Information Grid */}
                    <View style={styles.containerSummaryInfoGrid}>
                      <View style={styles.containerSummaryInfoCard}>
                        <Text style={styles.containerSummaryInfoLabel}>
                          Service Type
                        </Text>
                        <Text style={styles.containerSummaryInfoValue}>
                          {container.serviceTypeId
                            ? `${serviceTypeService.formatForBadge(container.serviceTypeId)}${
                                selectedOrderData.serviceOrderNumbers?.[container.serviceTypeId]
                                  ? ` — ${selectedOrderData.serviceOrderNumbers[container.serviceTypeId]}`
                                  : ''
                              }`
                            : '—'}
                        </Text>
                      </View>
                      <View style={styles.containerSummaryInfoCard}>
                        <Text style={styles.containerSummaryInfoLabel}>
                          Waste Code(s)
                        </Text>
                        <Text style={styles.containerSummaryInfoValue}>
                          {container.wasteCodes && container.wasteCodes.length > 0
                            ? container.wasteCodes.join(', ')
                            : '—'}
                        </Text>
                      </View>
                      {container.shippingLabelBarcode ? (
                        <View style={styles.containerSummaryInfoCard}>
                          <View style={styles.containerSummaryInfoHeader}>
                            <Text style={styles.containerSummaryInfoLabel}>
                              Shipping Label
                            </Text>
                            <Button
                              title="Reprint"
                              variant="outline"
                              size="sm"
                              disabled={isCurrentOrderCompleted}
                              onPress={() => printShippingLabel(container)}
                              style={styles.reprintButtonInline}
                            />
                          </View>
                          <Text style={styles.containerSummaryInfoValue}>
                            {container.shippingLabelBarcode}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.containerSummaryInfoCard} />
                      )}
                    </View>
                    {canEditContainers && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() =>
                          handleDeleteContainer(container.id, index)
                        }
                        activeOpacity={0.7}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Containers Added</Text>
              <Text style={styles.emptyStateText}>
                Add containers to track waste collection for this order.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          title="+ Add Container"
          variant="outline"
          size="md"
          disabled={isCurrentOrderCompleted || manifestGenerated}
          onPress={() => {
            if (canEditContainers) {
              setCurrentStep('stream-selection');
            }
          }}
        />
        {returnToContainersReviewAfterAdd ? (
          <Button
            title="Back to containers review"
            variant="primary"
            size="md"
            onPress={() => {
              setReturnToContainersReviewAfterAdd(false);
              setCurrentStep('containers-review');
            }}
          />
        ) : selectedOrderData &&
          isOrderReadyForManifest(selectedOrderData) ? (
          <Button
            title="Back to Manifest"
            variant="primary"
            size="md"
            disabled={isCurrentOrderCompleted}
            onPress={() => setCurrentStep('containers-review')}
          />
        ) : (
          <Button
            title="Mark service type complete"
            variant="primary"
            size="md"
            disabled={isCurrentOrderCompleted || !activeServiceTypeTimer}
            onPress={handleMarkServiceTypeComplete}
          />
        )}
      </View>

      {/* Bottom Sheet Delete Confirmation (Tablet-Optimized) */}
      <Modal
        visible={deleteConfirmation.visible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelDelete}>
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={handleCancelDelete}>
          <TouchableOpacity
            style={styles.bottomSheetContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            {/* Bottom Sheet Handle */}
            <View style={styles.bottomSheetHandle} />

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Delete Container</Text>
            </View>

            <View style={styles.bottomSheetBody}>
              <Text style={styles.bottomSheetMessage}>
                Are you sure you want to delete Container{' '}
                {deleteConfirmation.containerIndex !== null
                  ? deleteConfirmation.containerIndex + 1
                  : ''}
                ? This action cannot be undone.
              </Text>
              <Text style={deleteConfirmStyles.confirmInstructions}>
                To confirm, enter the container's shipping label:
              </Text>
              <TextInput
                style={deleteConfirmStyles.barcodeInput}
                value={deleteBarcodeInput}
                onChangeText={setDeleteBarcodeInput}
                placeholder="Enter shipping label"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={expectedBarcode.length > 0}
              />
            </View>

            <View style={styles.bottomSheetFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="lg"
                onPress={handleCancelDelete}
                style={styles.bottomSheetCancelButton}
              />
              <Button
                title="Delete"
                variant="destructive"
                size="lg"
                disabled={!isBarcodeMatch}
                onPress={handleConfirmDelete}
                style={styles.bottomSheetDeleteButton}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const deleteConfirmStyles = StyleSheet.create({
  confirmInstructions: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  expectedBarcode: {
    ...typography.lg,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.foreground,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    letterSpacing: 1,
  },
  barcodeInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    ...typography.base,
    color: colors.foreground,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
