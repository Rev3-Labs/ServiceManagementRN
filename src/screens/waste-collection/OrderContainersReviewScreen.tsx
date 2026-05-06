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

export interface OrderContainersReviewScreenProps {
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

  // Containers review specific
  activeContainers: AddedContainer[];
  setAddedContainers: (
    containers: AddedContainer[] | ((prev: AddedContainer[]) => AddedContainer[]),
  ) => void;
  hasManifestForOrder: (orderNumber: string) => boolean;
  generateManifestTrackingNumber: () => string;
  setManifestTrackingNumber: (number: string | null) => void;
  setManifestOrderNumber: (orderNumber: string | null) => void;
  setManifestData: (
    data:
      | {
          trackingNumber?: string;
          createdAt?: Date;
          scannedImageUri?: string;
          signatureImageUri?: string;
        }
      | ((
          prev: {
            trackingNumber?: string;
            createdAt?: Date;
            scannedImageUri?: string;
            signatureImageUri?: string;
          } | null,
        ) => {
          trackingNumber?: string;
          createdAt?: Date;
          scannedImageUri?: string;
          signatureImageUri?: string;
        } | null)
      | null,
  ) => void;
}

export const OrderContainersReviewScreen: React.FC<OrderContainersReviewScreenProps> = ({
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
  activeContainers,
  setAddedContainers,
  hasManifestForOrder,
  generateManifestTrackingNumber,
  setManifestTrackingNumber,
  setManifestOrderNumber,
  setManifestData,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string} | null>(
    null,
  );
  const [deleteBarcodeInput, setDeleteBarcodeInput] = useState('');
  const manifestGenerated = selectedOrderData
    ? hasManifestForOrder(selectedOrderData.orderNumber)
    : false;
  const canEditContainers = !manifestGenerated;

  const containerToDelete = deleteConfirm
    ? activeContainers.find(c => c.id === deleteConfirm.id)
    : null;
  const expectedBarcode = (
    containerToDelete?.shippingLabelBarcode ||
    containerToDelete?.barcode ||
    ''
  ).trim();
  const isBarcodeMatch =
    expectedBarcode.length > 0 &&
    deleteBarcodeInput.trim() === expectedBarcode;

  const openDeleteConfirm = (id: string) => {
    setDeleteBarcodeInput('');
    setDeleteConfirm({id});
  };

  const closeDeleteConfirm = () => {
    setDeleteBarcodeInput('');
    setDeleteConfirm(null);
  };

  const handleDeleteFromReview = (containerId: string) => {
    if (!isBarcodeMatch) return;
    setAddedContainers(prev => prev.filter(c => c.id !== containerId));
    closeDeleteConfirm();
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
        onBackPress={() => setCurrentStep('dashboard')}
        subtitle="Container Review"
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
        onViewNotes={() => setShowJobNotesModal(true)}
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
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.summaryText}>
          {manifestGenerated
            ? 'A manifest has been generated for this order. Containers cannot be added or deleted.'
            : `Showing ${activeContainers.length} container${
                activeContainers.length !== 1 ? 's' : ''
              } for this order`}
        </Text>

        {activeContainers.length > 0 ? (
          activeContainers.map((container, index) => (
            <Card key={container.id} style={styles.containerSummaryCard}>
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
                      {container.containerSize} • {container.containerType}
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
                <View style={styles.containerSummaryInfoGrid}>
                  <View style={styles.containerSummaryInfoCard}>
                    <Text style={styles.containerSummaryInfoLabel}>
                      Service Type
                    </Text>
                    <Text style={styles.containerSummaryInfoValue}>
                      {container.serviceTypeId
                        ? `${serviceTypeService.formatForBadge(container.serviceTypeId)} — ${serviceTypeService.getServiceTypeName(container.serviceTypeId)}`
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
                  {typeof container.cylinderCount === 'number' && (
                    <View style={styles.containerSummaryInfoCard}>
                      <Text style={styles.containerSummaryInfoLabel}>
                        Cylinders
                      </Text>
                      <Text style={styles.containerSummaryInfoValue}>
                        {container.cylinderCount}
                      </Text>
                    </View>
                  )}
                  {container.shippingLabelBarcode ? (
                    <View style={styles.containerSummaryInfoCard}>
                      <Text style={styles.containerSummaryInfoLabel}>
                        Shipping Label
                      </Text>
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
                    onPress={() => openDeleteConfirm(container.id)}
                    activeOpacity={0.7}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
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
      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          onPress={() => setCurrentStep('dashboard')}
        />
        <Button
          title={
            manifestGenerated
              ? 'Continue to manifest'
              : 'Generate Manifest'
          }
          variant="primary"
          size="md"
          onPress={() => {
            if (
              selectedOrderData &&
              !hasManifestForOrder(selectedOrderData.orderNumber)
            ) {
              const trackingNumber = generateManifestTrackingNumber();
              setManifestTrackingNumber(trackingNumber);
              setManifestOrderNumber(selectedOrderData.orderNumber);
              setManifestData(prev => ({
                ...prev,
                trackingNumber,
                createdAt: new Date(),
              }));
            }
            setCurrentStep('manifest-management');
          }}
        />
      </View>

      {/* Bottom Sheet Delete Confirmation (Tablet-Optimized) */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="slide"
        onRequestClose={closeDeleteConfirm}>
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={closeDeleteConfirm}>
          <TouchableOpacity
            style={styles.bottomSheetContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}>
            <View style={styles.bottomSheetHandle} />

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Delete Container</Text>
            </View>

            <View style={styles.bottomSheetBody}>
              <Text style={styles.bottomSheetMessage}>
                Are you sure you want to delete this container? This action
                cannot be undone.
              </Text>
              <Text style={deleteConfirmStyles.confirmInstructions}>
                To confirm, enter the container's barcode:
              </Text>
              <TextInput
                style={deleteConfirmStyles.barcodeInput}
                value={deleteBarcodeInput}
                onChangeText={setDeleteBarcodeInput}
                placeholder="Enter barcode"
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
                onPress={closeDeleteConfirm}
                style={styles.bottomSheetCancelButton}
              />
              <Button
                title="Delete"
                variant="destructive"
                size="lg"
                disabled={!isBarcodeMatch}
                onPress={() =>
                  deleteConfirm &&
                  handleDeleteFromReview(deleteConfirm.id)
                }
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
