import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {Button} from '../../components/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../../components/Card';
import {Badge} from '../../components/Badge';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {
  OrderData,
  FlowStep,
  MaterialsSupply,
} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {colors} from '../../styles/theme';
import {styles} from './styles';
import {
  formatServiceRequestLabel,
  getDefaultExpandedServiceTypeId,
  groupMaterialsByServiceRequest,
} from './containerGrouping';

export interface MaterialsSuppliesScreenProps {
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

  // Materials-specific props
  materialsSupplies: MaterialsSupply[];
  setMaterialsSupplies: (materials: MaterialsSupply[] | ((prev: MaterialsSupply[]) => MaterialsSupply[])) => void;
  setShowAddMaterialModal: (show: boolean) => void;
  activeServiceTypeTimer: string | null;
  handleMarkServiceTypeComplete: () => void;
}

export const MaterialsSuppliesScreen: React.FC<MaterialsSuppliesScreenProps> = ({
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
  materialsSupplies,
  setMaterialsSupplies,
  setShowAddMaterialModal,
  activeServiceTypeTimer,
  handleMarkServiceTypeComplete,
}) => {
  const {width: windowWidth} = useWindowDimensions();
  const useCompactMaterialsLayout = windowWidth < 1000;

  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  const handleDeleteMaterial = (id: string) => {
    setMaterialsSupplies(prev => prev.filter(m => m.id !== id));
  };

  const handleAdjustQuantity = (id: string, delta: number) => {
    setMaterialsSupplies(prev =>
      prev.map(m =>
        m.id === id ? {...m, quantity: Math.max(1, m.quantity + delta)} : m,
      ),
    );
  };

  const groupedMaterials = useMemo(
    () =>
      groupMaterialsByServiceRequest(
        materialsSupplies,
        selectedOrderData?.programs ?? [],
      ),
    [materialsSupplies, selectedOrderData?.programs],
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
        groupMaterialsByServiceRequest(
          materialsSupplies,
          selectedOrderData?.programs ?? [],
        ),
        activeServiceTypeTimer,
      ),
  );

  useEffect(() => {
    const defaultGroups = groupMaterialsByServiceRequest(
      materialsSupplies,
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

  if (!selectedOrderData) return null;

  const renderQuantityControls = (material: MaterialsSupply) => (
    <View style={styles.quantityEditContainer}>
      <TouchableOpacity
        onPress={() => handleAdjustQuantity(material.id, -1)}
        disabled={isCurrentOrderCompleted || material.quantity <= 1}
        style={[
          styles.quantityEditButton,
          (isCurrentOrderCompleted || material.quantity <= 1) && {
            opacity: 0.4,
          },
        ]}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Icon name="remove" size={20} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={styles.materialsTableQuantity}>{material.quantity}</Text>
      <TouchableOpacity
        onPress={() => handleAdjustQuantity(material.id, 1)}
        disabled={isCurrentOrderCompleted}
        style={[
          styles.quantityEditButton,
          isCurrentOrderCompleted && {opacity: 0.4},
        ]}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Icon name="add" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );

  const renderDeleteButton = (materialId: string) => (
    <TouchableOpacity
      onPress={() => handleDeleteMaterial(materialId)}
      disabled={isCurrentOrderCompleted}
      style={styles.deleteMaterialButton}>
      <Text style={styles.deleteMaterialButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderTypeBadge = (material: MaterialsSupply) => (
    <Badge variant={material.type === 'used' ? 'default' : 'secondary'}>
      {material.type === 'used' ? 'Used' : 'Left Behind'}
    </Badge>
  );

  const renderMaterialCard = (
    material: MaterialsSupply,
    serviceTypeId: string,
  ) => (
    <View key={material.id} style={styles.materialCard}>
      <View style={styles.materialCardHeader}>
        <View style={styles.materialCardHeaderLeft}>
          <Text style={styles.materialCardServiceRequest}>
            {formatServiceRequestLabel(serviceTypeId, selectedOrderData)}
          </Text>
          <Text style={styles.materialCardItemNumber}>{material.itemNumber}</Text>
          <Text style={styles.materialCardDescription}>
            {material.description}
          </Text>
        </View>
        {renderTypeBadge(material)}
      </View>
      <View style={styles.materialCardFooter}>
        <View style={styles.materialCardQtyRow}>
          <Text style={styles.materialCardQtyLabel}>Qty</Text>
          {renderQuantityControls(material)}
        </View>
        {renderDeleteButton(material.id)}
      </View>
    </View>
  );

  const renderMaterialRow = (
    material: MaterialsSupply,
    serviceTypeId: string,
  ) => (
    <View key={material.id} style={styles.materialsTableRow}>
      <Text
        style={[
          styles.materialsTableCell,
          styles.materialsTableCellServiceRequest,
        ]}>
        {formatServiceRequestLabel(serviceTypeId, selectedOrderData)}
      </Text>
      <Text style={styles.materialsTableCell}>{material.itemNumber}</Text>
      <Text
        style={[
          styles.materialsTableCell,
          styles.materialsTableCellDescription,
        ]}>
        {material.description}
      </Text>
      <View style={styles.materialsTableCell}>
        {renderQuantityControls(material)}
      </View>
      <View style={styles.materialsTableCell}>{renderTypeBadge(material)}</View>
      <View style={styles.materialsTableCell}>
        {renderDeleteButton(material.id)}
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.materialsTableHeader}>
      <Text
        style={[
          styles.materialsTableHeaderText,
          styles.materialsTableCellServiceRequest,
        ]}>
        Service Request
      </Text>
      <Text style={styles.materialsTableHeaderText}>Item #</Text>
      <Text
        style={[
          styles.materialsTableHeaderText,
          styles.materialsTableCellDescription,
        ]}>
        Description
      </Text>
      <Text style={styles.materialsTableHeaderText}>Qty</Text>
      <Text style={styles.materialsTableHeaderText}>Type</Text>
      <Text style={styles.materialsTableHeaderText}>Action</Text>
    </View>
  );

  const totalQuantity = materialsSupplies.reduce(
    (sum, material) => sum + material.quantity,
    0,
  );

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
        onBackPress={() => setCurrentStep('manifest-management')}
        subtitle="Supplies"
        elapsedTimeDisplay={elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData ? elapsedTimeDisplay : undefined}
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}>
          <Card>
            <CardHeader
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <CardTitle style={{marginBottom: 0, flex: 1}}>
                <CardTitleText>Materials & Supplies</CardTitleText>
              </CardTitle>
              <Button
                title="Add Materials & Supplies"
                variant="primary"
                size="sm"
                disabled={isCurrentOrderCompleted}
                onPress={() => setShowAddMaterialModal(true)}
              />
            </CardHeader>
            <CardContent>
              <Text style={styles.cardDescription}>
                Track materials and supplies used or left behind for this work
                order.
              </Text>

              {materialsSupplies.length > 0 ? (
                <>
                  <Text style={styles.summaryText}>
                    {materialsSupplies.length} item
                    {materialsSupplies.length !== 1 ? 's' : ''} • {totalQuantity}{' '}
                    total qty across this work order
                  </Text>

                  {groupedMaterials.map(group => {
                    const isExpanded = expandedServiceTypeId === group.serviceTypeId;
                    const groupQuantity = group.materials.reduce(
                      (sum, material) => sum + material.quantity,
                      0,
                    );

                    return (
                      <View
                        key={group.serviceTypeId}
                        style={styles.containerServiceGroup}>
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
                                  'in-progress' &&
                                  styles.serviceTypeBadgeInProgress,
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
                                  'completed' &&
                                  styles.serviceTypeBadgeTextCompleted,
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
                              {group.materials.length} item
                              {group.materials.length !== 1 ? 's' : ''} •{' '}
                              {groupQuantity} qty
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
                            {useCompactMaterialsLayout ? (
                              <View style={styles.materialCardList}>
                                {group.materials.map(material =>
                                  renderMaterialCard(
                                    material,
                                    group.serviceTypeId,
                                  ),
                                )}
                              </View>
                            ) : (
                              <View style={styles.materialsTable}>
                                {renderTableHeader()}
                                {group.materials.map(material =>
                                  renderMaterialRow(
                                    material,
                                    group.serviceTypeId,
                                  ),
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={styles.emptyMaterialsState}>
                  <Text style={styles.emptyMaterialsText}>
                    No materials or supplies added yet
                  </Text>
                  <Text style={styles.emptyMaterialsSubtext}>
                    Tap "Add Materials & Supplies" to get started
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
          onPress={() => setCurrentStep('manifest-management')}
        />
        <Button
          title="Mark service type complete"
          variant="primary"
          size="md"
          disabled={!activeServiceTypeTimer}
          onPress={handleMarkServiceTypeComplete}
        />
      </View>
    </View>
  );
};
