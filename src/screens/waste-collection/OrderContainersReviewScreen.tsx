import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Modal} from 'react-native';
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
  isServiceTypeNoShip: (orderNumber: string, serviceTypeId: string) => boolean;
  setActiveServiceTypeTimer: (id: string | null) => void;
  setReturnToContainersReviewAfterAdd: (value: boolean) => void;
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
  isServiceTypeNoShip,
  setActiveServiceTypeTimer,
  setReturnToContainersReviewAfterAdd,
  hasManifestForOrder,
  generateManifestTrackingNumber,
  setManifestTrackingNumber,
  setManifestOrderNumber,
  setManifestData,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string} | null>(
    null,
  );
  const manifestGenerated = selectedOrderData
    ? hasManifestForOrder(selectedOrderData.orderNumber)
    : false;

  const containersByServiceType = useMemo(() => {
    const map = new Map<string, typeof activeContainers>();
    if (!selectedOrderData) return map;
    selectedOrderData.programs.forEach(stId => {
      map.set(
        stId,
        activeContainers.filter(c => c.serviceTypeId === stId),
      );
    });
    const unassigned = activeContainers.filter(c => !c.serviceTypeId);
    if (unassigned.length > 0) map.set('_unassigned', unassigned);
    return map;
  }, [selectedOrderData, activeContainers]);

  const handleDeleteFromReview = (containerId: string) => {
    setAddedContainers(prev => prev.filter(c => c.id !== containerId));
    setDeleteConfirm(null);
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
        subtitle="Containers by service type"
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
            : 'Review and edit containers by service type before creating the manifest. You can add or delete containers for any service type.'}
        </Text>
        {selectedOrderData.programs.map(stId => {
          const list = containersByServiceType.get(stId) ?? [];
          const stName = serviceTypeService.getServiceTypeName(stId);
          const srNumber = selectedOrderData.serviceOrderNumbers?.[stId];
          return (
            <View key={stId} style={styles.containersReviewSection}>
              <View style={styles.containersReviewSectionHeader}>
                <Text style={styles.containersReviewSectionTitle}>
                  {serviceTypeService.formatForBadge(stId)} — {stName}
                  {srNumber ? ` • ${srNumber}` : ''}
                </Text>
                <Text style={styles.containersReviewSectionCount}>
                  {list.length} container{list.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {list.length === 0 ? (
                <View>
                  <Text style={styles.containersReviewEmpty}>
                    No containers added for this service type.
                  </Text>
                  {isServiceTypeNoShip(
                    selectedOrderData.orderNumber,
                    stId,
                  ) && (
                    <Text style={styles.containersReviewNoShipNote}>
                      Marked as No-Ship.
                    </Text>
                  )}
                </View>
              ) : (
                list.map((c, idx) => (
                  <Card key={c.id} style={styles.containerSummaryCard}>
                    <View style={styles.containerSummaryHeader}>
                      <View style={styles.containerSummaryHeaderLeft}>
                        <Text style={styles.containerSummaryNumber}>
                          #{idx + 1}
                        </Text>
                        <View style={styles.containerSummaryTitleGroup}>
                          <Text style={styles.containerSummaryTitle}>
                            {c.streamName}
                          </Text>
                          <Text style={styles.containerSummarySubtitle}>
                            {c.containerSize} • {c.containerType}
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
                          {c.netWeight} lbs
                        </Text>
                      </View>
                    </View>
                    {!manifestGenerated && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => setDeleteConfirm({id: c.id})}
                        activeOpacity={0.7}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                ))
              )}
              {!manifestGenerated &&
                !isServiceTypeNoShip(
                  selectedOrderData.orderNumber,
                  stId,
                ) && (
                  <Button
                    title={`Add container to ${serviceTypeService.formatForBadge(
                      stId,
                    )}${srNumber ? ` (${srNumber})` : ''}`}
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setActiveServiceTypeTimer(stId);
                      setReturnToContainersReviewAfterAdd(true);
                      setCurrentStep('stream-selection');
                    }}
                    style={styles.containersReviewAddBtn}
                  />
                )}
            </View>
          );
        })}
        {(containersByServiceType.get('_unassigned')?.length ?? 0) > 0 && (
          <View style={styles.containersReviewSection}>
            <Text style={styles.containersReviewSectionTitle}>
              Unassigned
            </Text>
            {(containersByServiceType.get('_unassigned') ?? []).map(
              (c, idx) => (
                <Card key={c.id} style={styles.containerSummaryCard}>
                  <View style={styles.containerSummaryHeader}>
                    <View style={styles.containerSummaryHeaderLeft}>
                      <Text style={styles.containerSummaryNumber}>
                        #{idx + 1}
                      </Text>
                      <Text style={styles.containerSummaryTitle}>
                        {c.streamName}
                      </Text>
                      <Text style={styles.containerSummaryNetWeightValue}>
                        {c.netWeight} lbs
                      </Text>
                    </View>
                  </View>
                  {!manifestGenerated && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => setDeleteConfirm({id: c.id})}
                      activeOpacity={0.7}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              ),
            )}
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

      {/* Delete confirmation */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
          }}>
          <View style={styles.containersReviewDeleteModal}>
            <Text style={styles.containersReviewDeleteTitle}>
              Delete container?
            </Text>
            <Text style={styles.containersReviewDeleteMessage}>
              This cannot be undone.
            </Text>
            <View style={styles.footer}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setDeleteConfirm(null)}
              />
              <Button
                title="Delete"
                variant="destructive"
                size="md"
                onPress={() =>
                  deleteConfirm &&
                  handleDeleteFromReview(deleteConfirm.id)
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
