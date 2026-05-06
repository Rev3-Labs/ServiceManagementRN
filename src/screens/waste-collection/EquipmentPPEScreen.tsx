import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {Button} from '../../components/Button';
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
}) => {
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<
    string | null
  >(null);
  const [equipmentQuantity, setEquipmentQuantity] = useState('1');
  const [showAddEquipmentSuccess, setShowAddEquipmentSuccess] =
    useState(false);

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
    if (!selectedEquipmentItem) return;
    const quantity = parseInt(equipmentQuantity) || 1;
    setEquipmentPPE(prev => {
      const existing = prev.find(e => e.name === selectedEquipmentItem);
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
        },
      ];
    });
    // Show success indicator
    setShowAddEquipmentSuccess(true);
    setTimeout(() => setShowAddEquipmentSuccess(false), 2000);
    // Reset form but keep modal open
    setSelectedEquipmentItem(null);
    setEquipmentQuantity('1');
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipmentPPE(prev => prev.filter(e => e.id !== id));
  };

  const handleAdjustCount = (id: string, delta: number) => {
    setEquipmentPPE(prev =>
      prev.map(e =>
        e.id === id ? {...e, count: Math.max(1, e.count + delta)} : e,
      ),
    );
  };

  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
        onBackPress={() => setCurrentStep('manifest-management')}
        subtitle="Equipment"
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
          contentContainerStyle={styles.scrollContent}>
          <Card>
            <CardHeader
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <CardTitle style={{marginBottom: 0, flex: 1}}>
                <CardTitleText>Equipment & PPE</CardTitleText>
              </CardTitle>
              <Button
                title="Add Equipment & PPE"
                variant="primary"
                size="sm"
                onPress={() => setShowAddEquipmentModal(true)}
              />
            </CardHeader>
            <CardContent>
              <Text style={styles.cardDescription}>
                Track equipment and PPE items used during service completion
              </Text>

              {equipmentPPE.length > 0 ? (
                <View style={styles.materialsTable}>
                  <View style={styles.materialsTableHeader}>
                    <Text
                      style={[
                        styles.materialsTableHeaderText,
                        styles.materialsTableCellDescription,
                      ]}>
                      Equipment
                    </Text>
                    <Text style={styles.materialsTableHeaderText}>Qty</Text>
                    <Text style={styles.materialsTableHeaderText}>
                      Action
                    </Text>
                  </View>
                  {equipmentPPE.map(equipment => (
                    <View key={equipment.id} style={styles.materialsTableRow}>
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
                      <View style={styles.materialsTableCell}>
                        <TouchableOpacity
                          onPress={() => handleDeleteEquipment(equipment.id)}
                          style={styles.deleteMaterialButton}>
                          <Text style={styles.deleteMaterialButtonText}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyMaterialsState}>
                  <Text style={styles.emptyMaterialsText}>
                    No equipment or PPE added yet
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
          onPress={() => setCurrentStep('manifest-management')}
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
        onRequestClose={() => setShowAddEquipmentModal(false)}>
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <Text style={styles.fullScreenModalTitle}>
              Add Equipment & PPE
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddEquipmentModal(false);
                setSelectedEquipmentItem(null);
                setEquipmentQuantity('1');
              }}
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
                <Text style={styles.sectionTitle}>Select Equipment</Text>
                <Text style={styles.sectionDescription}>
                  Choose equipment or PPE from the catalog
                </Text>
                <ScrollView
                  style={styles.modalCatalogScroll}
                  contentContainerStyle={styles.modalCatalogContent}>
                  {EQUIPMENT_PPE_CATALOG.map(item => (
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
                  ))}
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
              onPress={() => {
                setShowAddEquipmentModal(false);
                setSelectedEquipmentItem(null);
                setEquipmentQuantity('1');
              }}
              style={styles.fullScreenModalCancelButton}
            />
            <Button
              title="Add Equipment"
              variant="primary"
              size="lg"
              disabled={!selectedEquipmentItem}
              onPress={handleAddEquipment}
              style={styles.fullScreenModalAddButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
