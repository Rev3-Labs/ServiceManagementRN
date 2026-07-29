import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import {Button} from '../../components/Button';
import {Badge} from '../../components/Badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../../components/Card';
import {Icon} from '../../components/Icon';
import {Input} from '../../components/Input';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {
  OrderData,
  FlowStep,
  EquipmentPPE as EquipmentPPEType,
} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {colors} from '../../styles/theme';
import {isTablet} from '../../utils/responsive';
import {styles} from './styles';
import {
  formatServiceRequestLabel,
  getDefaultExpandedServiceTypeId,
  groupEquipmentByServiceRequest,
  UNASSIGNED_SERVICE_TYPE_ID,
} from './containerGrouping';
import {ServiceRequestPicker} from './ServiceRequestPicker';
import {isItemUnassigned} from './serviceRequestReview';
import {ConfirmDeleteModal} from './ConfirmDeleteModal';

export interface EquipmentPPEScreenProps {
  // PersistentOrderHeader props
  selectedOrderData: OrderData | null;
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  setCurrentStep: (step: FlowStep) => void;
  elapsedTimeDisplay: string;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  handleRequestPause: () => void;
  handleResumeTracking: () => void;
  setShowJobNotesModal: (show: boolean) => void;
  onOrderNotes: () => void;
  hasWorkOrderNotes: boolean;
  validationState: {state: 'none' | 'warning' | 'error'; count: number};
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
    srNumber?: string;
    status: 'pending' | 'in-progress' | 'noship' | 'completed';
  }>;
  isOrderCompleted: (orderNumber: string) => boolean;

  // Equipment-specific props
  equipmentPPE: EquipmentPPEType[];
  setEquipmentPPE: (equipment: EquipmentPPEType[] | ((prev: EquipmentPPEType[]) => EquipmentPPEType[])) => void;
  activeServiceTypeTimer: string | null;
  handleMarkServiceTypeComplete: () => void;
  /**
   * When true, the user reached this screen from the manifest-completion
   * phase (where the service type is already considered complete), so the
   * "Mark service type complete" footer button should be hidden.
   */
  inManifestCompletion?: boolean;
  /** True when all service requests are complete and user is in review/manifest phase. */
  canAssignServiceRequests?: boolean;
  onBack: () => void;
}

export const EquipmentPPEScreen: React.FC<EquipmentPPEScreenProps> = ({
  selectedOrderData,
  isOrderHeaderCollapsed,
  setIsOrderHeaderCollapsed,
  setCurrentStep,
  elapsedTimeDisplay,
  currentOrderTimeTracking,
  handleRequestPause,
  handleResumeTracking,
  setShowJobNotesModal,
  onOrderNotes,
  hasWorkOrderNotes,
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
  equipmentPPE,
  setEquipmentPPE,
  activeServiceTypeTimer,
  handleMarkServiceTypeComplete,
  inManifestCompletion = false,
  canAssignServiceRequests = false,
  onBack,
}) => {
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<
    string | null
  >(null);
  const [equipmentQuantity, setEquipmentQuantity] = useState('1');
  const [equipmentServiceTypeId, setEquipmentServiceTypeId] = useState<
    string | null
  >(null);
  const [showAddEquipmentSuccess, setShowAddEquipmentSuccess] =
    useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [expandedServiceTypeId, setExpandedServiceTypeId] = useState<string | null>(
    null,
  );
  const [assigningEquipmentId, setAssigningEquipmentId] = useState<string | null>(
    null,
  );
  const [assignServiceTypeId, setAssignServiceTypeId] = useState<string | null>(
    null,
  );
  const [equipmentPendingDelete, setEquipmentPendingDelete] =
    useState<EquipmentPPEType | null>(null);

  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  // Pre-determined equipment/PPE list
  const EQUIPMENT_PPE_CATALOG = [
    'Safety Glasses',
    'Nitrile Gloves',
    'Protective Suit',
    'Respirator',
    'Hard Hat',
    'Safety Boots',
    'Hearing Protection',
    'Face Shield',
    'Apron',
    'Coveralls',
  ];

  const handleAddEquipment = () => {
    if (!selectedEquipmentItem || !selectedOrderData) return;
    const quantity = parseInt(equipmentQuantity) || 1;
    const serviceTypeId =
      canAssignServiceRequests && selectedOrderData.programs.length > 1
        ? equipmentServiceTypeId ?? undefined
        : selectedOrderData.programs.length === 1
          ? selectedOrderData.programs[0]
          : activeServiceTypeTimer ?? undefined;

    if (
      canAssignServiceRequests &&
      selectedOrderData.programs.length > 1 &&
      !serviceTypeId
    ) {
      return;
    }

    setEquipmentPPE(prev => {
      const existing = prev.find(
        e =>
          e.name === selectedEquipmentItem &&
          e.serviceTypeId === serviceTypeId,
      );
      if (existing) {
        return prev.map(e =>
          e.id === existing.id ? {...e, count: e.count + quantity} : e,
        );
      }
      return [
        ...prev,
        {
          id: `eq-${Date.now()}`,
          name: selectedEquipmentItem,
          count: quantity,
          serviceTypeId,
        },
      ];
    });
    setShowAddEquipmentSuccess(true);
    setTimeout(() => setShowAddEquipmentSuccess(false), 2000);
    setSelectedEquipmentItem(null);
    setEquipmentQuantity('1');
    setEquipmentServiceTypeId(null);
  };

  const resetAddEquipmentModal = () => {
    setShowAddEquipmentModal(false);
    setSelectedEquipmentItem(null);
    setEquipmentQuantity('1');
    setCatalogSearchQuery('');
    setEquipmentServiceTypeId(null);
  };

  const openAddEquipmentModal = () => {
    if (canAssignServiceRequests && selectedOrderData?.programs.length === 1) {
      setEquipmentServiceTypeId(selectedOrderData.programs[0]);
    } else {
      setEquipmentServiceTypeId(null);
    }
    setShowAddEquipmentModal(true);
  };

  const handleAssignEquipment = (equipmentId: string, serviceTypeId: string) => {
    setEquipmentPPE(prev =>
      prev.map(e =>
        e.id === equipmentId ? {...e, serviceTypeId} : e,
      ),
    );
    setAssigningEquipmentId(null);
    setAssignServiceTypeId(null);
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipmentPPE(prev => prev.filter(e => e.id !== id));
  };

  const requestDeleteEquipment = (equipment: EquipmentPPEType) => {
    if (isCurrentOrderCompleted) {
      return;
    }
    setEquipmentPendingDelete(equipment);
  };

  const confirmDeleteEquipment = () => {
    if (!equipmentPendingDelete) {
      return;
    }
    handleDeleteEquipment(equipmentPendingDelete.id);
    setEquipmentPendingDelete(null);
  };

  const handleAdjustCount = (id: string, delta: number) => {
    setEquipmentPPE(prev =>
      prev.map(e =>
        e.id === id ? {...e, count: Math.max(1, e.count + delta)} : e,
      ),
    );
  };
  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearchQuery.trim()) {
      return EQUIPMENT_PPE_CATALOG;
    }
    const searchLower = catalogSearchQuery.toLowerCase();
    return EQUIPMENT_PPE_CATALOG.filter(item =>
      item.toLowerCase().includes(searchLower),
    );
  }, [catalogSearchQuery]);

  const groupedEquipment = useMemo(
    () =>
      groupEquipmentByServiceRequest(
        equipmentPPE,
        selectedOrderData?.programs ?? [],
      ),
    [equipmentPPE, selectedOrderData?.programs],
  );

  const serviceTypeStatusById = useMemo(
    () =>
      new Map(
        serviceTypeBadgesForHeader.map(b => [b.serviceTypeId, b.status] as const),
      ),
    [serviceTypeBadgesForHeader],
  );

  useEffect(() => {
    const defaultGroups = groupEquipmentByServiceRequest(
      equipmentPPE,
      selectedOrderData?.programs ?? [],
    );
    setExpandedServiceTypeId(
      getDefaultExpandedServiceTypeId(defaultGroups, activeServiceTypeTimer),
    );
  }, [selectedOrderData?.orderNumber, activeServiceTypeTimer, equipmentPPE.length]);

  const needsEquipmentServicePicker =
    canAssignServiceRequests &&
    (selectedOrderData?.programs.length ?? 0) > 1;

  const renderAssignmentButton = (
    equipment: EquipmentPPEType,
    groupServiceTypeId: string,
  ) => {
    if (!canAssignServiceRequests) {
      return null;
    }

    const needsAssignment =
      groupServiceTypeId === UNASSIGNED_SERVICE_TYPE_ID ||
      isItemUnassigned(equipment.serviceTypeId, selectedOrderData?.programs ?? []);

    if (assigningEquipmentId === equipment.id) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={() => {
          setAssigningEquipmentId(equipment.id);
          setAssignServiceTypeId(
            needsAssignment ? null : (equipment.serviceTypeId ?? null),
          );
        }}
        style={styles.assignServiceRequestButton}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.assignServiceRequestButtonText}>
          {needsAssignment ? 'Assign' : 'Change'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAssignmentPanel = (equipment: EquipmentPPEType) => {
    if (!selectedOrderData || assigningEquipmentId !== equipment.id) {
      return null;
    }

    return (
      <View style={styles.assignServiceRequestPanel}>
        <ServiceRequestPicker
          order={selectedOrderData}
          selectedServiceTypeId={assignServiceTypeId}
          onSelect={setAssignServiceTypeId}
          label="Assign to service request"
          description="Choose which completed service request this equipment belongs to"
        />
        <View style={styles.assignServiceRequestActions}>
          <Button
            title="Cancel"
            variant="outline"
            size="sm"
            onPress={() => {
              setAssigningEquipmentId(null);
              setAssignServiceTypeId(null);
            }}
          />
          <Button
            title="Save"
            variant="primary"
            size="sm"
            disabled={!assignServiceTypeId}
            onPress={() => {
              if (assignServiceTypeId) {
                handleAssignEquipment(equipment.id, assignServiceTypeId);
              }
            }}
          />
        </View>
      </View>
    );
  };

  const renderEquipmentRow = (
    equipment: EquipmentPPEType,
    groupServiceTypeId: string,
  ) => (
    <View key={equipment.id}>
      <View style={styles.materialsTableRow}>
        <Text
          style={[
            styles.materialsTableCell,
            styles.materialsTableCellServiceRequest,
          ]}>
          {selectedOrderData
            ? formatServiceRequestLabel(groupServiceTypeId, selectedOrderData)
            : groupServiceTypeId}
        </Text>
        <Text
          style={[
            styles.materialsTableCell,
            styles.materialsTableCellDescription,
          ]}>
          {equipment.name}
        </Text>
        <View style={styles.materialsTableCell}>
          <View style={styles.quantityEditContainer}>
            <TouchableOpacity
              onPress={() => handleAdjustCount(equipment.id, -1)}
              disabled={equipment.count <= 1}
              style={[
                styles.quantityEditButton,
                equipment.count <= 1 && {opacity: 0.4},
              ]}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="remove" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.materialsTableQuantity}>
              {equipment.count}
            </Text>
            <TouchableOpacity
              onPress={() => handleAdjustCount(equipment.id, 1)}
              style={styles.quantityEditButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="add" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.materialsTableCell, styles.materialCardActions]}>
          {renderAssignmentButton(equipment, groupServiceTypeId)}
          <TouchableOpacity
            onPress={() => requestDeleteEquipment(equipment)}
            disabled={isCurrentOrderCompleted}
            style={[
              styles.deleteMaterialButton,
              isCurrentOrderCompleted && {opacity: 0.4},
            ]}>
            <Text style={styles.deleteMaterialButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      {renderAssignmentPanel(equipment)}
    </View>
  );

  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
        onBackPress={onBack}
        subtitle="Equipment"
        elapsedTimeDisplay={elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData ? elapsedTimeDisplay : undefined}
        isPaused={Boolean(currentOrderTimeTracking?.pausedAt)}
        onPause={handleRequestPause}
        onResume={handleResumeTracking}
        onViewNotes={() => {
          setShowJobNotesModal(true);
        }}
        onOrderNotes={onOrderNotes}
        hasWorkOrderNotes={hasWorkOrderNotes}
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
          <Card>
            <CardHeader
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <CardTitle style={{marginBottom: 0, flex: 1}}>
                <CardTitleText>Equipment</CardTitleText>
              </CardTitle>
              <Button
                title="Add Equipment"
                variant="primary"
                size="sm"
                onPress={openAddEquipmentModal}
              />
            </CardHeader>
            <CardContent>
              <Text style={styles.cardDescription}>
                Track equipment items used during service completion
              </Text>
              {canAssignServiceRequests && (
                <Text style={styles.reviewAssignHint}>
                  All service requests are complete. Assign each equipment item
                  to the correct service request before closing out the order.
                </Text>
              )}

              {equipmentPPE.length > 0 ? (
                <>
                  <Text style={styles.summaryText}>
                    {equipmentPPE.length} item
                    {equipmentPPE.length !== 1 ? 's' : ''} •{' '}
                    {equipmentPPE.reduce((sum, item) => sum + item.count, 0)}{' '}
                    total qty across this work order
                  </Text>

                  {groupedEquipment.map(group => {
                    const isExpanded = expandedServiceTypeId === group.serviceTypeId;
                    const groupCount = group.equipment.reduce(
                      (sum, item) => sum + item.count,
                      0,
                    );

                    return (
                      <View
                        key={group.serviceTypeId}
                        style={styles.containerServiceGroup}>
                        <Pressable
                          onPress={() =>
                            setExpandedServiceTypeId(prev =>
                              prev === group.serviceTypeId
                                ? null
                                : group.serviceTypeId,
                            )
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
                                  'in-progress' &&
                                  styles.serviceTypeBadgeInProgress,
                                (!serviceTypeStatusById.get(group.serviceTypeId) ||
                                  serviceTypeStatusById.get(group.serviceTypeId) ===
                                    'pending') &&
                                  styles.serviceTypeBadgePending,
                                group.serviceTypeId ===
                                  UNASSIGNED_SERVICE_TYPE_ID &&
                                  styles.serviceTypeBadgePending,
                              ])}
                              textStyle={StyleSheet.flatten([
                                styles.serviceTypeBadgeText,
                                serviceTypeStatusById.get(group.serviceTypeId) ===
                                  'noship' && styles.serviceTypeBadgeTextNoship,
                                serviceTypeStatusById.get(group.serviceTypeId) ===
                                  'completed' &&
                                  styles.serviceTypeBadgeTextCompleted,
                                serviceTypeStatusById.get(group.serviceTypeId) ===
                                  'in-progress' &&
                                  styles.serviceTypeBadgeTextInProgress,
                                (!serviceTypeStatusById.get(group.serviceTypeId) ||
                                  serviceTypeStatusById.get(group.serviceTypeId) ===
                                    'pending') &&
                                  styles.serviceTypeBadgeTextPending,
                                group.serviceTypeId ===
                                  UNASSIGNED_SERVICE_TYPE_ID &&
                                  styles.serviceTypeBadgeTextPending,
                              ])}>
                              {formatServiceRequestLabel(
                                group.serviceTypeId,
                                selectedOrderData,
                              )}
                            </Badge>
                            <Text style={styles.containerServiceGroupMeta}>
                              {group.equipment.length} item
                              {group.equipment.length !== 1 ? 's' : ''} •{' '}
                              {groupCount} qty
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
                            <View style={styles.materialsTable}>
                              <View style={styles.materialsTableHeader}>
                                <Text
                                  style={[
                                    styles.materialsTableHeaderText,
                                    styles.materialsTableCellServiceRequest,
                                  ]}>
                                  Service Request
                                </Text>
                                <Text
                                  style={[
                                    styles.materialsTableHeaderText,
                                    styles.materialsTableCellDescription,
                                  ]}>
                                  Equipment
                                </Text>
                                <Text style={styles.materialsTableHeaderText}>
                                  Qty
                                </Text>
                                <Text style={styles.materialsTableHeaderText}>
                                  Action
                                </Text>
                              </View>
                              {group.equipment.map(item =>
                                renderEquipmentRow(item, group.serviceTypeId),
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyMaterialsState}>
                  <Text style={styles.emptyMaterialsText}>
                    No equipment added yet
                  </Text>
                  <Text style={styles.emptyMaterialsSubtext}>
                    Tap "Add Equipment" to get started
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          onPress={onBack}
        />
        {!inManifestCompletion && (
          <Button
            title="Mark service type complete"
            variant="primary"
            size="md"
            disabled={!activeServiceTypeTimer}
            onPress={handleMarkServiceTypeComplete}
          />
        )}
      </View>

      {/* Add Equipment Modal - Full Screen */}
      <Modal
        visible={showAddEquipmentModal}
        animationType="slide"
        onRequestClose={resetAddEquipmentModal}>
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <Text style={styles.fullScreenModalTitle}>
              Add Equipment
            </Text>
            <TouchableOpacity
              onPress={resetAddEquipmentModal}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={styles.fullScreenModalCloseButton}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.fullScreenModalBody}>
            <View
              style={[
                styles.modalSplitContainer,
                isTablet()
                  ? styles.modalSplitContainerRow
                  : styles.modalSplitContainerColumn,
              ]}>
              {/* Left: Catalog Selection */}
              <View
                style={[
                  styles.modalCatalogPane,
                  isTablet() && styles.modalCatalogPaneTablet,
                ]}>
                <Text style={styles.sectionTitle}>Select Item</Text>
                <Text style={styles.sectionDescription}>
                  Choose an item below
                </Text>
                <Input
                  placeholder="Search equipment catalog..."
                  value={catalogSearchQuery}
                  onChangeText={setCatalogSearchQuery}
                  containerStyle={styles.searchInput}
                  clearable
                />
                <ScrollView
                  style={styles.modalCatalogScroll}
                  contentContainerStyle={styles.modalCatalogContent}>
                  {filteredCatalogItems.length > 0 ? (
                    filteredCatalogItems.map(item => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.materialCatalogItemVertical,
                          selectedEquipmentItem === item &&
                            styles.materialCatalogItemSelected,
                        ]}
                        onPress={() => setSelectedEquipmentItem(item)}>
                        <Text
                          style={[
                            styles.materialCatalogItemDescription,
                            selectedEquipmentItem === item &&
                              styles.materialCatalogItemDescriptionSelected,
                          ]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyMaterialsState}>
                      <Text style={styles.emptyMaterialsText}>
                        No equipment found
                      </Text>
                      <Text style={styles.emptyMaterialsSubtext}>
                        Try adjusting your search terms
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Right: Details Section (Always Visible) */}
              <View
                style={[
                  styles.modalDetailsPane,
                  isTablet() && styles.modalDetailsPaneTablet,
                ]}>
                <Text style={styles.sectionTitle}>Item Details</Text>
                {showAddEquipmentSuccess && (
                  <View style={styles.addSuccessIndicator}>
                    <View style={styles.successMessageRow}>
                      <Icon name="check-circle" size={18} color={colors.success} style={styles.successMessageIcon} />
                      <Text style={styles.addSuccessText}>Equipment added successfully!</Text>
                    </View>
                  </View>
                )}
                {selectedEquipmentItem ? (
                  <>
                    <View style={styles.selectedItemInfo}>
                      <Text style={styles.selectedItemDescription}>
                        {selectedEquipmentItem}
                      </Text>
                    </View>

                    <View style={styles.materialInputSection}>
                      <Input
                        label="Quantity"
                        value={equipmentQuantity}
                        onChangeText={setEquipmentQuantity}
                        keyboardType="numeric"
                        placeholder="1"
                      />
                    </View>

                    {needsEquipmentServicePicker && (
                      <View style={styles.materialInputSection}>
                        <ServiceRequestPicker
                          order={selectedOrderData}
                          selectedServiceTypeId={equipmentServiceTypeId}
                          onSelect={setEquipmentServiceTypeId}
                        />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noSelectionPlaceholder}>
                    <Text style={styles.noSelectionText}>
                      Select an item from the catalog to configure quantity
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.fullScreenModalFooter}>
            <Button
              title="Done"
              variant="outline"
              size="lg"
              onPress={resetAddEquipmentModal}
              style={styles.fullScreenModalCancelButton}
            />
            <Button
              title="Add Equipment"
              variant="primary"
              size="lg"
              disabled={
                !selectedEquipmentItem ||
                (needsEquipmentServicePicker && !equipmentServiceTypeId)
              }
              onPress={handleAddEquipment}
              style={styles.fullScreenModalAddButton}
            />
          </View>
        </View>
      </Modal>

      <ConfirmDeleteModal
        visible={equipmentPendingDelete != null}
        message={
          equipmentPendingDelete
            ? `Are you sure you want to delete ${equipmentPendingDelete.name}?`
            : ''
        }
        onCancel={() => setEquipmentPendingDelete(null)}
        onConfirm={confirmDeleteEquipment}
      />
    </View>
  );
};
