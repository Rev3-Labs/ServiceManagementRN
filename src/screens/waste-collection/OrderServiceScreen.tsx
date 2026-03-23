import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
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
  AddedContainer,
  MaterialsSupply,
  EquipmentPPE,
  ScannedDocument,
} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {syncService} from '../../services/syncService';
import {TimeTrackingRecord, stopTimeTracking} from '../../services/timeTrackingService';
import {serviceTypeTimeService, ServiceTypeTimeEntry} from '../../services/serviceTypeTimeService';
import {serviceTypeService} from '../../services/serviceTypeService';
import {colors} from '../../styles/theme';
import {styles} from './styles';

export interface OrderServiceScreenProps {
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

  // Order service-specific props
  activeContainers: AddedContainer[];
  selectedPrograms: Record<string, 'ship' | 'noship'>;
  materialsSupplies: MaterialsSupply[];
  equipmentPPE: EquipmentPPE[];
  addedContainers: AddedContainer[];
  scannedDocuments: ScannedDocument[];
  setCompletedOrders: (orders: string[] | ((prev: string[]) => string[])) => void;
  setOrderStatuses: (statuses: Record<string, OrderData['status']> | ((prev: Record<string, OrderData['status']>) => Record<string, OrderData['status']>)) => void;
  setSelectedOrderData: (order: OrderData | null) => void;
  setDashboardSelectedOrder: (order: OrderData | null) => void;
  setSelectedPrograms: (programs: Record<string, 'ship' | 'noship'> | ((prev: Record<string, 'ship' | 'noship'>) => Record<string, 'ship' | 'noship'>)) => void;
  setMaterialsSupplies: (materials: MaterialsSupply[] | ((prev: MaterialsSupply[]) => MaterialsSupply[])) => void;
  setEquipmentPPE: (equipment: EquipmentPPE[] | ((prev: EquipmentPPE[]) => EquipmentPPE[])) => void;
  setBarcode: (barcode: string) => void;
  setTareWeight: (weight: string) => void;
  setGrossWeight: (weight: string) => void;
  setShowChecklistModal: (show: boolean) => void;
  activeServiceTypeTimer: string | null;
  setActiveServiceTypeTimer: (timer: string | null) => void;
  serviceTypeTimeEntries: Map<string, ServiceTypeTimeEntry>;
  setServiceTypeTimeEntries: (entries: Map<string, ServiceTypeTimeEntry>) => void;
  activeTimeTracking: TimeTrackingRecord | null;
  setActiveTimeTracking: (tracking: TimeTrackingRecord | null) => void;
  setCurrentOrderTimeTracking: (tracking: TimeTrackingRecord | null) => void;
  setElapsedTimeDisplay: (display: string) => void;
  hasManifestForOrder: (orderNumber: string) => boolean;
  noshipByOrderAndServiceType: Record<string, Record<string, boolean>>;
  isServiceTypeNoShip: (orderNumber: string, serviceTypeId: string) => boolean;
  handleMarkServiceTypeComplete: () => void;
  showDocumentTypeSelector: boolean;
  setShowDocumentTypeSelector: (show: boolean) => void;
}

export const OrderServiceScreen: React.FC<OrderServiceScreenProps> = ({
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
  selectedPrograms,
  materialsSupplies,
  equipmentPPE,
  addedContainers,
  scannedDocuments,
  setCompletedOrders,
  setOrderStatuses,
  setSelectedOrderData,
  setDashboardSelectedOrder,
  setSelectedPrograms,
  setMaterialsSupplies,
  setEquipmentPPE,
  setBarcode,
  setTareWeight,
  setGrossWeight,
  setShowChecklistModal,
  activeServiceTypeTimer,
  setActiveServiceTypeTimer,
  serviceTypeTimeEntries,
  setServiceTypeTimeEntries,
  activeTimeTracking,
  setActiveTimeTracking,
  setCurrentOrderTimeTracking,
  setElapsedTimeDisplay,
  hasManifestForOrder,
  noshipByOrderAndServiceType,
  isServiceTypeNoShip,
  handleMarkServiceTypeComplete,
  showDocumentTypeSelector,
  setShowDocumentTypeSelector,
}) => {
  const totalNetWeight = activeContainers.reduce(
    (sum, c) => sum + c.netWeight,
    0,
  );
  const programsToShip = Object.values(selectedPrograms).filter(
    p => p === 'ship',
  ).length;

  // Get service type time entries for this order
  const serviceTypeTimeEntriesForOrder = selectedOrderData
    ? serviceTypeTimeService.getTimeEntriesForOrder(selectedOrderData.orderNumber)
    : [];
  const totalServiceTimeMinutes = selectedOrderData
    ? serviceTypeTimeService.getTotalDurationForOrder(selectedOrderData.orderNumber)
    : 0;

  // Check if all service types are complete
  const allServiceTypesComplete = selectedOrderData
    ? selectedOrderData.programs.every(serviceTypeId => {
        const entry = serviceTypeTimeService.getTimeEntry(
          selectedOrderData.orderNumber,
          serviceTypeId,
        );
        return entry?.startTime != null && entry?.endTime != null;
      })
    : false;

  // Local state
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [acknowledgeIncomplete, setAcknowledgeIncomplete] = useState(false);

  // Compute incomplete reasons for this order
  const incompleteReasons = useMemo(() => {
    const reasons: Array<{id: string; reason: string; severity: 'warning' | 'error'}> = [];

    // Check for scanned manifest - simulate missing for WO-2024-1234
    const hasScannedManifest = scannedDocuments.some(
      doc => doc.orderNumber === selectedOrderData?.orderNumber && doc.documentType === 'manifest'
    );
    if (!hasScannedManifest || selectedOrderData?.orderNumber === 'WO-2024-1234') {
      reasons.push({
        id: 'missing-manifest',
        reason: 'Scanned manifest document is missing',
        severity: 'error',
      });
    }

    // Check if no containers were added
    if (addedContainers.length === 0) {
      reasons.push({
        id: 'no-containers',
        reason: 'No containers have been added to this order',
        severity: 'warning',
      });
    }

    // Check if programs are not all selected
    const allProgramsSelected = selectedOrderData?.programs.every(
      program => selectedPrograms[program]
    );
    if (!allProgramsSelected && selectedOrderData?.programs && selectedOrderData.programs.length > 0) {
      reasons.push({
        id: 'incomplete-programs',
        reason: 'Not all programs have been selected',
        severity: 'warning',
      });
    }

    return reasons;
  }, [scannedDocuments, selectedOrderData, addedContainers, selectedPrograms]);

  const hasBlockingErrors = incompleteReasons.some(r => r.severity === 'error');

  const handleCompleteOrder = async () => {
    if (!customerFirstName.trim() || !customerLastName.trim()) {
      Alert.alert(
        'Required Fields',
        'Please enter customer first name and last name.',
      );
      return;
    }

    // Check for blocking errors that haven't been acknowledged
    if (hasBlockingErrors && !acknowledgeIncomplete) {
      Alert.alert(
        'Incomplete Order',
        'This order has incomplete items that must be acknowledged before completing. Please review the warnings above and check the acknowledgment box.',
      );
      return;
    }

    if (!selectedOrderData) return;

    // Store the service type that's being completed (before ending it)
    const completingServiceTypeId = activeServiceTypeTimer;

    // If there's an active service type timer, end it first
    if (activeServiceTypeTimer) {
      try {
        await serviceTypeTimeService.endServiceType(
          selectedOrderData.orderNumber,
          activeServiceTypeTimer,
        );

        // Reload service type time entries
        const entries = new Map<string, ServiceTypeTimeEntry>();
        selectedOrderData.programs.forEach(stId => {
          const entry = serviceTypeTimeService.getTimeEntry(
            selectedOrderData.orderNumber,
            stId,
          );
          if (entry) {
            entries.set(stId, entry);
          }
        });
        setServiceTypeTimeEntries(entries);
        setActiveServiceTypeTimer(null);
      } catch (error) {
        console.error('Error ending service type time tracking:', error);
        Alert.alert('Error', 'Failed to end service type time tracking');
        return;
      }
    }

    // Check if all service types are complete
    const allServiceTypesCompleteNow = selectedOrderData.programs.every(serviceTypeId => {
      const entry = serviceTypeTimeEntries.get(serviceTypeId);
      return entry?.startTime != null && entry?.endTime != null;
    });

    if (allServiceTypesCompleteNow) {
      // All service types are complete - complete the entire order
      // Queue order completion for sync
      await syncService.addPendingOperation('order', {
        orderNumber: selectedOrderData.orderNumber,
        completed: true,
        containers: addedContainers,
        programs: selectedPrograms,
        materialsSupplies,
        equipmentPPE,
        totalNetWeight,
        programsToShip,
        customerAcknowledgment: {
          firstName: customerFirstName,
          lastName: customerLastName,
          email: customerEmail || undefined,
          acknowledgedAt: new Date().toISOString(),
        },
      });

      // Stop overall order time tracking
      try {
        await stopTimeTracking(selectedOrderData.orderNumber);
        // Clear active tracking if this was the active order
        if (activeTimeTracking?.orderNumber === selectedOrderData.orderNumber) {
          setActiveTimeTracking(null);
        }
        // Clear current order tracking
        if (currentOrderTimeTracking?.orderNumber === selectedOrderData.orderNumber) {
          setCurrentOrderTimeTracking(null);
          setElapsedTimeDisplay('');
        }
      } catch (error) {
        console.error('Error stopping time tracking:', error);
      }

      // Mark order as completed
      setCompletedOrders(prev => [...prev, selectedOrderData.orderNumber]);
      // Update order status
      setOrderStatuses(prev => ({
        ...prev,
        [selectedOrderData.orderNumber]: 'Completed',
      }));
      // Reset state and clear selected order so user cannot open manifest/service types for completed order
      setSelectedOrderData(null);
      setDashboardSelectedOrder(null);
      // Keep addedContainers — they persist on truck until user marks and confirms drop in Record Drop flow
      setSelectedPrograms({});
      setMaterialsSupplies([]);
      setEquipmentPPE([]);
      setBarcode('');
      setTareWeight('45');
      setGrossWeight('285');
      setCurrentStep('dashboard');
    } else {
      // Not all service types are complete - just complete the current service type
      // Reload service type time entries to reflect the updated state
      const entries = new Map<string, ServiceTypeTimeEntry>();
      selectedOrderData.programs.forEach(stId => {
        const entry = serviceTypeTimeService.getTimeEntry(
          selectedOrderData.orderNumber,
          stId,
        );
        if (entry) {
          entries.set(stId, entry);
        }
      });
      setServiceTypeTimeEntries(entries);

      // Update order status to "Partial" (not all service types complete yet)
      setOrderStatuses(prev => ({
        ...prev,
        [selectedOrderData.orderNumber]: 'Partial',
      }));

      // Navigate to dashboard after completing service type
      setCurrentStep('dashboard');
      // Keep the order selected so user can start the next service type
      // Don't clear selectedOrderData - let user see the order and start next service type
    }
  };

  // Customer Acknowledgment View
  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
        onBackPress={() => setCurrentStep('manifest-management')}
        subtitle="Customer Acknowledgment"
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
          keyboardDismissMode="on-drag"
          removeClippedSubviews={false}>
          {/* Service Summary - Matching Print Layout */}
          <View style={styles.serviceSummaryContainer}>
            {/* Header */}
            <View style={styles.serviceSummaryHeader}>
              <Text style={styles.serviceSummaryTitle}>Service Summary</Text>
              <View style={styles.serviceSummaryLogo}>
                <Text style={styles.serviceSummaryLogoText}>CleanEarth</Text>
                <View style={styles.serviceSummaryLogoDot} />
              </View>
            </View>

            {/* Work Order # and Date Row */}
            <View style={styles.serviceSummaryTopRow}>
              <View style={styles.serviceSummaryTopItem}>
                <Text style={styles.serviceSummaryFieldLabel}>Work Order #:</Text>
                <Text style={styles.serviceSummaryFieldValue}>{selectedOrderData?.orderNumber || 'N/A'}</Text>
              </View>
              <View style={styles.serviceSummaryTopItem}>
                <Text style={styles.serviceSummaryFieldLabel}>Date:</Text>
                <Text style={styles.serviceSummaryFieldValue}>{new Date().toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Customer and Generator Section */}
            <View style={styles.serviceSummaryTwoColumn}>
              {/* CUSTOMER Section */}
              <View style={styles.serviceSummaryColumnBox}>
                <View style={styles.serviceSummarySectionHeader}>
                  <Text style={styles.serviceSummarySectionHeaderText}>CUSTOMER:</Text>
                </View>
                <View style={styles.serviceSummarySectionBody}>
                  <Text style={styles.serviceSummaryText}>HDDS</Text>
                  <Text style={styles.serviceSummaryText}>HDDS</Text>
                  <Text style={styles.serviceSummaryText}>5250 Triangle Parkway Suite 200</Text>
                  <Text style={styles.serviceSummaryText}>Peachtree Corners, GA 30092</Text>
                  <View style={styles.serviceSummaryFieldRow}>
                    <Text style={styles.serviceSummaryFieldLabel}>Phone:</Text>
                    <Text style={styles.serviceSummaryText}></Text>
                  </View>
                  <View style={styles.serviceSummaryFieldRow}>
                    <Text style={styles.serviceSummaryFieldLabel}>Billing:</Text>
                    <Text style={styles.serviceSummaryText}>A40000167</Text>
                  </View>
                </View>
              </View>

              {/* GENERATOR Section */}
              <View style={styles.serviceSummaryColumnBox}>
                <View style={styles.serviceSummarySectionHeader}>
                  <Text style={styles.serviceSummarySectionHeaderText}>GENERATOR:</Text>
                </View>
                <View style={styles.serviceSummarySectionBody}>
                  <Text style={styles.serviceSummaryText}>HDDS</Text>
                  <Text style={styles.serviceSummaryText}>Soleo Health#</Text>
                  <Text style={styles.serviceSummaryText}>1324 W Winton Ave</Text>
                  <Text style={styles.serviceSummaryText}>Hayward, CA 94545-1408</Text>
                  <View style={styles.serviceSummaryFieldRow}>
                    <Text style={styles.serviceSummaryFieldLabel}>Generator:</Text>
                    <Text style={styles.serviceSummaryText}>(510) 362-7360</Text>
                  </View>
                  <View style={styles.serviceSummaryFieldRow}>
                    <Text style={styles.serviceSummaryFieldLabel}>EPA ID:</Text>
                    <Text style={styles.serviceSummaryText}>CAL000483809</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* WORK ORDER DETAILS Section */}
            <View style={styles.serviceSummarySection}>
              <View style={styles.serviceSummarySectionHeader}>
                <Text style={styles.serviceSummarySectionHeaderText}>WORK ORDER DETAILS</Text>
              </View>
              <View style={styles.serviceSummaryTableRow}>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Account Rep</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Terms</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Purchase Order</Text>
                </View>
              </View>
              <View style={styles.serviceSummaryTableRow}>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableValue}>House Account</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableValue}>ON RECEIPT(4)</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 1}]}>
                  <Text style={styles.serviceSummaryTableValue}>West</Text>
                </View>
              </View>
            </View>

            {/* SERVICE TYPE TIME BREAKDOWN Section */}
            {serviceTypeTimeEntriesForOrder.length > 0 && (
              <View style={styles.serviceSummarySection}>
                <View style={styles.serviceSummarySectionHeader}>
                  <Text style={styles.serviceSummarySectionHeaderText}>SERVICE TYPE TIME BREAKDOWN</Text>
                </View>
                {serviceTypeTimeEntriesForOrder.map((entry, index) => {
                  const serviceType = serviceTypeService.getServiceType(entry.serviceTypeId);
                  return (
                    <View key={entry.serviceTypeId} style={styles.serviceSummaryTimeRow}>
                      <View style={styles.serviceSummaryTimeServiceType}>
                        <Text style={styles.serviceSummaryTimeServiceTypeName}>
                          {serviceType?.name || entry.serviceTypeId}:
                        </Text>
                      </View>
                      <View style={styles.serviceSummaryTimeDetails}>
                        <Text style={styles.serviceSummaryTimeText}>
                          {entry.startTime
                            ? serviceTypeTimeService.formatTime(entry.startTime)
                            : 'N/A'}{' '}
                          –{' '}
                          {entry.endTime
                            ? serviceTypeTimeService.formatTime(entry.endTime)
                            : 'In Progress'}{' '}
                          ({entry.durationMinutes !== null && entry.durationMinutes !== undefined
                            ? serviceTypeTimeService.formatDuration(entry.durationMinutes)
                            : 'N/A'})
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {totalServiceTimeMinutes > 0 && (
                  <View style={styles.serviceSummaryTimeTotal}>
                    <Text style={styles.serviceSummaryTimeTotalLabel}>Total Service Time:</Text>
                    <Text style={styles.serviceSummaryTimeTotalValue}>
                      {serviceTypeTimeService.formatDuration(totalServiceTimeMinutes)}
                    </Text>
                  </View>
                )}
                {currentOrderTimeTracking && (
                  <View style={styles.serviceSummaryTimeTotal}>
                    <Text style={styles.serviceSummaryTimeTotalLabel}>Order Time (Total On-Site):</Text>
                    <Text style={styles.serviceSummaryTimeTotalValue}>
                      {elapsedTimeDisplay || 'N/A'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* WORK PERFORMED Section */}
            <View style={styles.serviceSummarySection}>
              <View style={styles.serviceSummarySectionHeader}>
                <Text style={styles.serviceSummarySectionHeaderText}>WORK PERFORMED</Text>
              </View>
              <View style={styles.serviceSummaryTableRow}>
                <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Profile #</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Profile Name</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Size</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 60}]}>
                  <Text style={styles.serviceSummaryTableHeader}>VOL</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 40}]}>
                  <Text style={styles.serviceSummaryTableHeader}>UOM</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Number of Containers</Text>
                </View>
              </View>
              {addedContainers.length > 0 ? (
                addedContainers.map((container, index) => (
                  <View key={container.id} style={styles.serviceSummaryTableRow}>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>5014883{index + 3}</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                      <Text style={styles.serviceSummaryTableValue}>{container.streamName}</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>{container.containerSize}</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 60}]}>
                      <Text style={styles.serviceSummaryTableValue}>{String(container.netWeight).padStart(5, '0')}</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 40}]}>
                      <Text style={styles.serviceSummaryTableValue}>P</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>1</Text>
                    </View>
                  </View>
                ))
              ) : (
                <>
                  <View style={styles.serviceSummaryTableRow}>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>50148833</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                      <Text style={styles.serviceSummaryTableValue}>W PHARMACEUTICAL AEROSOLS/ INHALERS</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>Box 2.5 Ga</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 60}]}>
                      <Text style={styles.serviceSummaryTableValue}>00001</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 40}]}>
                      <Text style={styles.serviceSummaryTableValue}>P</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>1</Text>
                    </View>
                  </View>
                  <View style={styles.serviceSummaryTableRow}>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>50148851</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                      <Text style={styles.serviceSummaryTableValue}>FLAMMABLE/CORROSIVE PHARMACEUTICALS (AMMONIA INHAL</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>Box 2.5 Ga</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 60}]}>
                      <Text style={styles.serviceSummaryTableValue}>00002</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 40}]}>
                      <Text style={styles.serviceSummaryTableValue}>P</Text>
                    </View>
                    <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                      <Text style={styles.serviceSummaryTableValue}>1</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* LABOR, MATERIAL AND SUPPLIES USED Section */}
            <View style={styles.serviceSummarySection}>
              <View style={styles.serviceSummarySectionHeader}>
                <Text style={styles.serviceSummarySectionHeaderText}>LABOR, MATERIAL AND SUPPLIES USED</Text>
              </View>
              <View style={styles.serviceSummaryTableRow}>
                <View style={[styles.serviceSummaryTableCell, {width: 100}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Product</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Description</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                  <Text style={styles.serviceSummaryTableHeader}># Delivered</Text>
                </View>
              </View>
              {materialsSupplies.filter(m => m.type === 'used').length > 0 ? (
                materialsSupplies
                  .filter(m => m.type === 'used')
                  .map(material => (
                    <View key={material.id} style={styles.serviceSummaryTableRow}>
                      <View style={[styles.serviceSummaryTableCell, {width: 100}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.itemNumber}</Text>
                      </View>
                      <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.description}</Text>
                      </View>
                      <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.quantity}</Text>
                      </View>
                    </View>
                  ))
              ) : (
                <View style={[styles.serviceSummaryTableRow, {minHeight: 30}]}>
                  <View style={[styles.serviceSummaryTableCell, {width: 100}]} />
                  <View style={[styles.serviceSummaryTableCell, {flex: 2}]} />
                  <View style={[styles.serviceSummaryTableCell, {width: 80}]} />
                </View>
              )}
            </View>

            {/* LABOR, MATERIAL AND SUPPLIES LEFT BEHIND Section */}
            <View style={styles.serviceSummarySection}>
              <View style={styles.serviceSummarySectionHeader}>
                <Text style={styles.serviceSummarySectionHeaderText}>LABOR, MATERIAL AND SUPPLIES LEFT BEHIND</Text>
              </View>
              <View style={styles.serviceSummaryTableRow}>
                <View style={[styles.serviceSummaryTableCell, {width: 100}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Product</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                  <Text style={styles.serviceSummaryTableHeader}>Description</Text>
                </View>
                <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                  <Text style={styles.serviceSummaryTableHeader}># Delivered</Text>
                </View>
              </View>
              {materialsSupplies.filter(m => m.type === 'left_behind').length > 0 ? (
                materialsSupplies
                  .filter(m => m.type === 'left_behind')
                  .map(material => (
                    <View key={material.id} style={styles.serviceSummaryTableRow}>
                      <View style={[styles.serviceSummaryTableCell, {width: 100}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.itemNumber}</Text>
                      </View>
                      <View style={[styles.serviceSummaryTableCell, {flex: 2}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.description}</Text>
                      </View>
                      <View style={[styles.serviceSummaryTableCell, {width: 80}]}>
                        <Text style={styles.serviceSummaryTableValue}>{material.quantity}</Text>
                      </View>
                    </View>
                  ))
              ) : (
                <View style={[styles.serviceSummaryTableRow, {minHeight: 30}]}>
                  <View style={[styles.serviceSummaryTableCell, {width: 100}]} />
                  <View style={[styles.serviceSummaryTableCell, {flex: 2}]} />
                  <View style={[styles.serviceSummaryTableCell, {width: 80}]} />
                </View>
              )}
            </View>

            {/* Customer Acknowledgement Section */}
            <View style={styles.serviceSummaryAcknowledgement}>
              <View style={styles.serviceSummaryAckLeft}>
                <Text style={styles.serviceSummaryAckTitle}>Customer{'\n'}Acknowledgement:</Text>
              </View>
              <View style={styles.serviceSummaryAckMiddle}>
                <View style={styles.serviceSummaryAckField}>
                  <Text style={styles.serviceSummaryAckLabel}>Last Name:</Text>
                  <View style={styles.serviceSummaryAckInputLine} />
                </View>
                <View style={styles.serviceSummaryAckField}>
                  <Text style={styles.serviceSummaryAckLabel}>First Name:</Text>
                  <View style={styles.serviceSummaryAckInputLine} />
                </View>
                <View style={styles.serviceSummaryAckField}>
                  <Text style={styles.serviceSummaryAckLabel}>Email:</Text>
                  <View style={styles.serviceSummaryAckInputLine} />
                </View>
              </View>
              <View style={styles.serviceSummaryAckRight}>
                <View style={styles.serviceSummaryAckField}>
                  <Text style={styles.serviceSummaryAckLabel}>Technician:</Text>
                  <Text style={styles.serviceSummaryAckValue}>Rashad Sayles</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.serviceSummaryFooter}>
              <View style={styles.serviceSummaryFooterItem}>
                <Text style={styles.serviceSummaryFooterLabel}>Work Order #:</Text>
                <Text style={styles.serviceSummaryFooterValue}>{selectedOrderData?.orderNumber || 'N/A'}</Text>
              </View>
              <View style={styles.serviceSummaryFooterItem}>
                <Text style={styles.serviceSummaryFooterLabel}>On Site Time:</Text>
                <Text style={styles.serviceSummaryFooterValueMuted}>Not Available - Offline</Text>
              </View>
              <View style={styles.serviceSummaryFooterItem}>
                <Text style={styles.serviceSummaryFooterLabel}>Departure Time:</Text>
                <Text style={styles.serviceSummaryFooterValue}>11/14/2025 9:36:24 AM</Text>
              </View>
            </View>
          </View>

          {/* Incomplete Reasons Warning */}
          {incompleteReasons.length > 0 && (
            <Card style={styles.incompleteWarningCard}>
              <CardHeader>
                <CardTitle>
                  <View style={styles.incompleteWarningHeader}>
                    <Icon name="warning" size={20} color="#B45309" />
                    <Text style={styles.incompleteWarningTitleText}>
                      Incomplete Order - Action Required
                    </Text>
                  </View>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text style={styles.incompleteWarningDescription}>
                  The following items are incomplete and must be addressed or acknowledged before completing this order:
                </Text>

                <View style={styles.incompleteReasonsList}>
                  {incompleteReasons.map(item => (
                    <View
                      key={item.id}
                      style={[
                        styles.incompleteReasonItem,
                        item.severity === 'error'
                          ? styles.incompleteReasonError
                          : styles.incompleteReasonWarning
                      ]}
                    >
                      <Text style={styles.incompleteReasonBullet}>
                        <Icon
                          name={item.severity === 'error' ? 'error' : 'warning'}
                          size={16}
                          color={item.severity === 'error' ? colors.destructive : colors.warning}
                        />
                      </Text>
                      <View style={styles.incompleteReasonContent}>
                        <Text style={[
                          styles.incompleteReasonText,
                          item.severity === 'error' && styles.incompleteReasonTextError
                        ]}>
                          {item.reason}
                        </Text>
                        {item.id === 'missing-manifest' && (
                          <Text style={styles.incompleteReasonHint}>
                            Use the "Scan Documents" quick action to capture the signed manifest
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {hasBlockingErrors && (
                  <TouchableOpacity
                    style={styles.acknowledgeCheckboxRow}
                    onPress={() => setAcknowledgeIncomplete(!acknowledgeIncomplete)}
                  >
                    <View style={[
                      styles.acknowledgeCheckbox,
                      acknowledgeIncomplete && styles.acknowledgeCheckboxChecked
                    ]}>
                      {acknowledgeIncomplete && (
                        <Icon name="check" size={18} color={colors.primaryForeground} />
                      )}
                    </View>
                    <Text style={styles.acknowledgeCheckboxLabel}>
                      I acknowledge that this order is incomplete and want to proceed anyway
                    </Text>
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Customer Information</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Text style={styles.cardDescription}>
                Enter customer information to acknowledge this order
              </Text>

              <Input
                label="First Name *"
                value={customerFirstName}
                onChangeText={setCustomerFirstName}
                placeholder="Enter first name"
                style={styles.customerInput}
              />

              <Input
                label="Last Name *"
                value={customerLastName}
                onChangeText={setCustomerLastName}
                placeholder="Enter last name"
                style={styles.customerInput}
              />

              <Input
                label="Email (Optional)"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.customerInput}
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
          title="Service Checklist"
          variant="secondary"
          size="md"
          onPress={() => {
            setShowChecklistModal(true);
          }}
        />
        <Button
          title={allServiceTypesComplete ? "Acknowledge & Complete Order" : "Acknowledge & Complete Service Type"}
          variant="primary"
          size="md"
          onPress={handleCompleteOrder}
        />
      </View>
    </View>
  );
};
