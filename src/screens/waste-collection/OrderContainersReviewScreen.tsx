import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {Button} from '../../components/Button';
import {Input} from '../../components/Input';
import {Badge} from '../../components/Badge';
import {Card} from '../../components/Card';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {FlowStep, OrderData, AddedContainer} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {styles} from './styles';
import {
  formatServiceRequestLabel,
  getDefaultExpandedServiceTypeId,
  groupContainersByServiceRequest,
} from './containerGrouping';
import {DeleteContainerConfirmModal} from './DeleteContainerConfirmModal';

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
  activeServiceTypeTimer: string | null;
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
  activeServiceTypeTimer,
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
  const [containerSearchQuery, setContainerSearchQuery] = useState('');
  const manifestGenerated = selectedOrderData
    ? hasManifestForOrder(selectedOrderData.orderNumber)
    : false;
  const canEditContainers = !manifestGenerated;

  const containerToDelete = deleteConfirm
    ? activeContainers.find(c => c.id === deleteConfirm.id)
    : null;
  const containerToDeleteNumber = containerToDelete
    ? activeContainers.findIndex(c => c.id === containerToDelete.id) + 1
    : undefined;
  const expectedBarcode = (
    containerToDelete?.shippingLabelBarcode ||
    containerToDelete?.barcode ||
    ''
  ).trim();
  const isBarcodeMatch =
    expectedBarcode.length > 0 &&
    deleteBarcodeInput.trim() === expectedBarcode;
  const filteredContainers = useMemo(() => {
    if (!containerSearchQuery.trim()) {
      return activeContainers;
    }

    const searchLower = containerSearchQuery.toLowerCase();
    return activeContainers.filter(container => {
      const serviceTypeText =
        container.serviceTypeId && selectedOrderData
          ? formatServiceRequestLabel(container.serviceTypeId, selectedOrderData)
          : '';
      const wasteCodeText = container.wasteCodes?.join(' ') ?? '';
      return (
        container.streamName.toLowerCase().includes(searchLower) ||
        container.containerSize.toLowerCase().includes(searchLower) ||
        container.containerType.toLowerCase().includes(searchLower) ||
        container.barcode.toLowerCase().includes(searchLower) ||
        (container.shippingLabelBarcode || '').toLowerCase().includes(searchLower) ||
        serviceTypeText.toLowerCase().includes(searchLower) ||
        wasteCodeText.toLowerCase().includes(searchLower)
      );
    });
  }, [activeContainers, containerSearchQuery, selectedOrderData]);

  const groupedContainers = useMemo(
    () =>
      groupContainersByServiceRequest(
        filteredContainers,
        selectedOrderData?.programs ?? [],
      ),
    [filteredContainers, selectedOrderData?.programs],
  );
  const serviceTypeStatusById = useMemo(
    () =>
      new Map(
        serviceTypeBadgesForHeader.map(b => [b.serviceTypeId, b.status] as const),
      ),
    [serviceTypeBadgesForHeader],
  );

  const [expandedServiceTypeId, setExpandedServiceTypeId] = useState<string | null>(
    () =>
      getDefaultExpandedServiceTypeId(
        groupContainersByServiceRequest(
          activeContainers,
          selectedOrderData?.programs ?? [],
        ),
        activeServiceTypeTimer,
      ),
  );

  useEffect(() => {
    const defaultGroups = groupContainersByServiceRequest(
      activeContainers,
      selectedOrderData?.programs ?? [],
    );
    setExpandedServiceTypeId(
      getDefaultExpandedServiceTypeId(defaultGroups, activeServiceTypeTimer),
    );
  }, [selectedOrderData?.orderNumber, activeServiceTypeTimer]);

  const handleToggleServiceRequestGroup = (serviceTypeId: string) => {
    setExpandedServiceTypeId(prev =>
      prev === serviceTypeId ? null : serviceTypeId,
    );
  };

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

  const renderContainerCard = (container: AddedContainer, index: number) => (
    <Card key={container.id} style={styles.containerSummaryCard}>
      <View style={styles.containerSummaryHeader}>
        <View style={styles.containerSummaryHeaderLeft}>
          <Text style={styles.containerSummaryNumber}>#{index + 1}</Text>
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
          <Text style={styles.containerSummaryNetWeightLabel}>Net</Text>
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
            <Text style={styles.containerSummaryInfoLabel}>Service Type</Text>
            <Text style={styles.containerSummaryInfoValue}>
              {container.serviceTypeId
                ? formatServiceRequestLabel(
                    container.serviceTypeId,
                    selectedOrderData,
                  )
                : '—'}
            </Text>
          </View>
          <View style={styles.containerSummaryInfoCard}>
            <Text style={styles.containerSummaryInfoLabel}>Waste Code(s)</Text>
            <Text style={styles.containerSummaryInfoValue}>
              {container.wasteCodes && container.wasteCodes.length > 0
                ? container.wasteCodes.join(', ')
                : '—'}
            </Text>
          </View>
          {container.unitCount != null ? (
            <View style={styles.containerSummaryInfoCard}>
              <Text style={styles.containerSummaryInfoLabel}>Unit Count</Text>
              <Text style={styles.containerSummaryInfoValue}>
                {container.unitCount}
              </Text>
            </View>
          ) : null}
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
  );

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
        <Input
          placeholder="Search container by shipping label..."
          value={containerSearchQuery}
          onChangeText={setContainerSearchQuery}
          containerStyle={styles.searchInput}
          clearable
        />
        <Text style={styles.summaryText}>
          {manifestGenerated
            ? 'A manifest has been generated for this order. Containers cannot be added or deleted.'
            : `Showing ${filteredContainers.length} container${
                filteredContainers.length !== 1 ? 's' : ''
              } for this order`}
        </Text>

        {groupedContainers.length > 0 ? (
          groupedContainers.map(group => {
            const isExpanded = expandedServiceTypeId === group.serviceTypeId;
            return (
              <View key={group.serviceTypeId} style={styles.containerServiceGroup}>
                <Pressable
                  onPress={() =>
                    handleToggleServiceRequestGroup(group.serviceTypeId)
                  }
                  style={styles.containerServiceGroupHeader}
                  accessibilityRole="button"
                  accessibilityState={{expanded: isExpanded}}>
                  <View style={styles.containerServiceGroupHeaderLeft}>
                    <Badge
                      variant="outline"
                      style={StyleSheet.flatten([
                        styles.serviceTypeBadge,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'noship' && styles.serviceTypeBadgeNoship,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'completed' && styles.serviceTypeBadgeCompleted,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'in-progress' && styles.serviceTypeBadgeInProgress,
                        (!serviceTypeStatusById.get(group.serviceTypeId) ||
                          serviceTypeStatusById.get(group.serviceTypeId) ===
                            'pending') &&
                          styles.serviceTypeBadgePending,
                      ])}
                      textStyle={StyleSheet.flatten([
                        styles.serviceTypeBadgeText,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'noship' && styles.serviceTypeBadgeTextNoship,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'completed' && styles.serviceTypeBadgeTextCompleted,
                        serviceTypeStatusById.get(group.serviceTypeId) ===
                          'in-progress' &&
                          styles.serviceTypeBadgeTextInProgress,
                        (!serviceTypeStatusById.get(group.serviceTypeId) ||
                          serviceTypeStatusById.get(group.serviceTypeId) ===
                            'pending') &&
                          styles.serviceTypeBadgeTextPending,
                      ])}>
                      {formatServiceRequestLabel(
                        group.serviceTypeId,
                        selectedOrderData,
                      )}
                    </Badge>
                    <Text style={styles.containerServiceGroupMeta}>
                      {group.containers.length} container
                      {group.containers.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Icon
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={colors.mutedForeground}
                  />
                </Pressable>
                {isExpanded && (
                  <View style={styles.containerServiceGroupBody}>
                    {group.containers.map((container, index) =>
                      renderContainerCard(container, index),
                    )}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {activeContainers.length > 0
                ? 'No Containers Found'
                : 'No Containers Added'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeContainers.length > 0
                ? 'Try adjusting your search terms.'
                : 'Add containers to track waste collection for this order.'}
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

      <DeleteContainerConfirmModal
        visible={!!deleteConfirm}
        container={containerToDelete ?? null}
        orderData={selectedOrderData}
        containerNumber={containerToDeleteNumber}
        barcodeInput={deleteBarcodeInput}
        onBarcodeChange={setDeleteBarcodeInput}
        onCancel={closeDeleteConfirm}
        onConfirm={() =>
          deleteConfirm && handleDeleteFromReview(deleteConfirm.id)
        }
      />
    </View>
  );
};
