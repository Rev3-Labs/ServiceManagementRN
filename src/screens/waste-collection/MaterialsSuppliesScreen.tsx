import React, {useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
          <Text style={styles.materialsTableQuantity}>
            {material.quantity}
          </Text>
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
                title="Add Material & Supply"
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
                    {materialsSupplies.length !== 1 ? 's' : ''} •{' '}
                    {totalQuantity} total qty across this work order
                  </Text>
                  <View style={styles.materialsTable}>
                    {renderTableHeader()}
                    {materialsSupplies.map(renderMaterialRow)}
                  </View>
                </>
              ) : (
                <View style={styles.emptyMaterialsState}>
                  <Text style={styles.emptyMaterialsText}>
                    No materials or supplies added yet
                  </Text>
                  <Text style={styles.emptyMaterialsSubtext}>
                    Tap "Add Material & Supply" to get started
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
