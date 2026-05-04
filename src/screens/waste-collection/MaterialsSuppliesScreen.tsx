import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import {serviceTypeService} from '../../services/serviceTypeService';
import {colors} from '../../styles/theme';
import {styles} from './styles';

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
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(
    null,
  );
  const [editQuantityValue, setEditQuantityValue] = useState('');

  const handleDeleteMaterial = (id: string) => {
    setMaterialsSupplies(prev => prev.filter(m => m.id !== id));
  };

  const handleStartEditQuantity = (id: string, currentQuantity: number) => {
    setEditingQuantityId(id);
    setEditQuantityValue(String(currentQuantity));
  };

  const handleSaveQuantity = (id: string) => {
    const newQuantity = parseInt(editQuantityValue) || 1;
    setMaterialsSupplies(prev =>
      prev.map(m => (m.id === id ? {...m, quantity: newQuantity} : m)),
    );
    setEditingQuantityId(null);
    setEditQuantityValue('');
  };

  /** Materials grouped by service type (using order programs as the canonical order). */
  const materialsByServiceType = useMemo(() => {
    const map = new Map<string, MaterialsSupply[]>();
    if (!selectedOrderData) return map;
    selectedOrderData.programs.forEach(stId => {
      map.set(
        stId,
        materialsSupplies.filter(m => m.serviceTypeId === stId),
      );
    });
    const unassigned = materialsSupplies.filter(
      m => !m.serviceTypeId ||
        !selectedOrderData.programs.includes(m.serviceTypeId),
    );
    if (unassigned.length > 0) map.set('_unassigned', unassigned);
    return map;
  }, [selectedOrderData, materialsSupplies]);

  const totalQuantity = useMemo(
    () => materialsSupplies.reduce((sum, m) => sum + m.quantity, 0),
    [materialsSupplies],
  );

  if (!selectedOrderData) return null;

  const renderMaterialRow = (material: MaterialsSupply) => (
    <View key={material.id} style={styles.materialsTableRow}>
      <Text style={styles.materialsTableCell}>{material.itemNumber}</Text>
      <Text
        style={[
          styles.materialsTableCell,
          styles.materialsTableCellDescription,
        ]}>
        {material.description}
      </Text>
      <View style={styles.materialsTableCell}>
        {editingQuantityId === material.id ? (
          <View style={styles.quantityEditContainer}>
            <TextInput
              style={styles.quantityEditInput}
              value={editQuantityValue}
              onChangeText={setEditQuantityValue}
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity
              onPress={() => handleSaveQuantity(material.id)}
              style={styles.quantityEditButton}>
              <Icon name="check" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditingQuantityId(null);
                setEditQuantityValue('');
              }}
              style={styles.quantityEditButton}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() =>
              handleStartEditQuantity(material.id, material.quantity)
            }
            disabled={isCurrentOrderCompleted}>
            <Text style={styles.materialsTableQuantity}>
              {material.quantity}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.materialsTableCell}>
        <Badge
          variant={material.type === 'used' ? 'default' : 'secondary'}>
          {material.type === 'used' ? 'Used' : 'Left Behind'}
        </Badge>
      </View>
      <View style={styles.materialsTableCell}>
        <TouchableOpacity
          onPress={() => handleDeleteMaterial(material.id)}
          disabled={isCurrentOrderCompleted}
          style={styles.deleteMaterialButton}>
          <Text style={styles.deleteMaterialButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.materialsTableHeader}>
      <Text style={styles.materialsTableHeaderText}>Item #</Text>
      <Text style={styles.materialsTableHeaderText}>Description</Text>
      <Text style={styles.materialsTableHeaderText}>Qty</Text>
      <Text style={styles.materialsTableHeaderText}>Type</Text>
      <Text style={styles.materialsTableHeaderText}>Action</Text>
    </View>
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
            <CardHeader>
              <CardTitle>
                <CardTitleText>Materials & Supplies</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardDescription}>
                Track materials and supplies used or left behind for this
                order. Items are grouped by service type.
              </Text>

              {materialsSupplies.length > 0 ? (
                <Text style={styles.summaryText}>
                  {materialsSupplies.length} item
                  {materialsSupplies.length !== 1 ? 's' : ''} •{' '}
                  {totalQuantity} total qty across this work order
                </Text>
              ) : null}

              {selectedOrderData.programs.map(stId => {
                const list = materialsByServiceType.get(stId) ?? [];
                const stName = serviceTypeService.getServiceTypeName(stId);
                const srNumber =
                  selectedOrderData.serviceOrderNumbers?.[stId];
                return (
                  <View key={stId} style={styles.containersReviewSection}>
                    <View style={styles.containersReviewSectionHeader}>
                      <Text style={styles.containersReviewSectionTitle}>
                        {serviceTypeService.formatForBadge(stId)} — {stName}
                        {srNumber ? ` • ${srNumber}` : ''}
                      </Text>
                      <Text style={styles.containersReviewSectionCount}>
                        {list.length} item{list.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {list.length === 0 ? (
                      <Text style={styles.containersReviewEmpty}>
                        No materials or supplies for this service type.
                      </Text>
                    ) : (
                      <View style={styles.materialsTable}>
                        {renderTableHeader()}
                        {list.map(renderMaterialRow)}
                      </View>
                    )}
                  </View>
                );
              })}

              {(materialsByServiceType.get('_unassigned')?.length ?? 0) > 0 && (
                <View style={styles.containersReviewSection}>
                  <View style={styles.containersReviewSectionHeader}>
                    <Text style={styles.containersReviewSectionTitle}>
                      Unassigned
                    </Text>
                    <Text style={styles.containersReviewSectionCount}>
                      {materialsByServiceType.get('_unassigned')!.length} item
                      {materialsByServiceType.get('_unassigned')!.length !== 1
                        ? 's'
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.materialsTable}>
                    {renderTableHeader()}
                    {materialsByServiceType
                      .get('_unassigned')!
                      .map(renderMaterialRow)}
                  </View>
                </View>
              )}

              {materialsSupplies.length === 0 && (
                <View style={styles.emptyMaterialsState}>
                  <Text style={styles.emptyMaterialsText}>
                    No materials or supplies added yet
                  </Text>
                  <Text style={styles.emptyMaterialsSubtext}>
                    Tap "Add Material" to get started
                  </Text>
                </View>
              )}

              <Button
                title="Add Material & Supply"
                variant="primary"
                size="md"
                disabled={isCurrentOrderCompleted}
                onPress={() => setShowAddMaterialModal(true)}
                style={styles.addMaterialButton}
              />
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
