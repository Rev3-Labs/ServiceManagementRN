import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Modal,
  FlatList,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  Image,
  ImageStyle,
  SafeAreaView,
  Linking,
  ViewStyle,
} from 'react-native';
import SignatureCanvas from '../components/SignatureCanvas';
import DropWasteModal from '../components/DropWasteModal';
import ChecklistScreen from './ChecklistScreen';
import {sampleChecklist} from '../data/sampleChecklist';
import {ChecklistAnswer} from '../types/checklist';
import {Button} from '../components/Button';
import {Input} from '../components/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../components/Card';
import {Badge} from '../components/Badge';
import {Switch} from '../components/Switch';
import {Icon} from '../components/Icon';
import {syncService, SyncStatus} from '../services/syncService';
import {recordContainerDrop} from '../services/dropWasteService';
import {getUserTruckId, getUserTruck, getUserTrailer} from '../services/userSettingsService';
import {vehicleService} from '../services/vehicleService';
import {offlineTrackingService, OfflineStatus} from '../services/offlineTrackingService';
import {
  getPersistedIssues,
  updateValidationIssues,
  clearValidationIssues,
} from '../services/validationService';
import {serviceCenterService, ServiceCenter} from '../services/serviceCenterService';
import {
  startTimeTracking,
  stopTimeTracking,
  getActiveTimeTracking,
  getTimeTrackingForOrder,
  formatDuration,
  pauseTimeTracking,
  resumeTimeTracking,
  TimeTrackingRecord,
} from '../services/timeTrackingService';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';
import {
  getGridColumns,
  getResponsiveValue,
  isTablet,
  isLandscape,
  getSidebarWidth,
} from '../utils/responsive';
import {
  FlowStep,
  OrderData,
  WasteStream,
  ContainerType,
  AddedContainer,
  Screen,
  WasteCollectionScreenProps,
  ValidationIssue,
} from '../types/wasteCollection';
import {MOCK_ORDERS} from '../data/mockOrders';
import {MATERIALS_CATALOG} from '../data/materialsCatalog';
import {PersistentOrderHeader} from '../components/PersistentOrderHeader';
import {PhotoCaptureButton} from '../components/PhotoCaptureButton';
import {photoService} from '../services/photoService';
import {pListedAuthorizationService, PListedCode} from '../services/pListedAuthorizationService';
import {serviceTypeService} from '../services/serviceTypeService';
import {serviceTypeTimeService, ServiceTypeTimeEntry} from '../services/serviceTypeTimeService';
import {
  NO_SHIP_REASON_CODES,
  NO_SHIP_OTHER_CODE,
  MIN_OTHER_NOTES_LENGTH,
  getNoShipReasonLabel,
  isOtherReason,
  type NoShipReasonCode,
  type NoShipRecord,
} from '../constants/noShipReasons';

/** Approved facilities for Transfer Location override (FR-3a.EXT.3.1). Technician's Service Center is prepended at runtime. */
const APPROVED_TRANSFER_LOCATIONS = [
  'Main Transfer Station - Downtown',
  'Northside Waste Facility',
  'Southside Recycling Center',
  'East End Transfer Point',
  'West Industrial Waste Hub',
  'Central Processing Facility',
  'Riverside Drop-Off Site',
  'Highway 101 Transfer Station',
  'Airport Road Waste Center',
  'Port Authority Facility',
  'Mountain View Disposal Site',
  'Valley Waste Management',
  'Coastal Transfer Station',
  'Inland Processing Center',
  'Metro Waste Facility',
  'Suburban Drop Point',
  'Urban Collection Center',
  'Regional Transfer Hub',
  'City Main Facility',
  'Industrial Park Station',
];

const {width, height} = Dimensions.get('window');
const gridColumns = getGridColumns();
const cardWidth = (width - spacing.lg * (gridColumns + 1)) / gridColumns;

const WasteCollectionScreen: React.FC<WasteCollectionScreenProps> = ({
  username,
  onLogout,
  onNavigate,
  onGoBack,
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('dashboard');
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistAnswers, setChecklistAnswers] = useState<ChecklistAnswer[] | null>(null);
  const [selectedOrderData, setSelectedOrderData] = useState<OrderData | null>(
    null,
  );
  const [isOrderHeaderCollapsed, setIsOrderHeaderCollapsed] = useState(true);
  const [showJobNotesModal, setShowJobNotesModal] = useState(false);
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showOfflineBlockedModal, setShowOfflineBlockedModal] = useState(false);
  const [persistedValidationIssues, setPersistedValidationIssues] = useState<ValidationIssue[]>([]);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(
    offlineTrackingService.getStatus(),
  );
  const [serviceCenter, setServiceCenter] = useState<ServiceCenter | null>(
    serviceCenterService.getServiceCenter(),
  );
  const [showServiceCenterModal, setShowServiceCenterModal] = useState(false);
  const [showServiceCenterUpdateNotification, setShowServiceCenterUpdateNotification] = useState(false);
  const [updatedServiceCenterName, setUpdatedServiceCenterName] = useState<string>('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [orderPhotos, setOrderPhotos] = useState(
    selectedOrderData ? photoService.getPhotosForOrder(selectedOrderData.orderNumber) : []
  );
  const [photoNoteEdit, setPhotoNoteEdit] = useState<{
    photoId: string;
    caption: string;
  } | null>(null);
  const [photoConfirm, setPhotoConfirm] = useState<{
    type: 'deleteNote' | 'removePhoto';
    orderNumber: string;
    photoId: string;
  } | null>(null);
  const [showPListedAuthModal, setShowPListedAuthModal] = useState(false);
  const [pListedAuthAcknowledged, setPListedAuthAcknowledged] = useState(false);
  const [pListedAuthResult, setPListedAuthResult] = useState<{
    authorized: boolean;
    authorization: any;
    failureReason?: string;
    pCodes: PListedCode[];
  } | null>(null);
  const [pListedAuthCode, setPListedAuthCode] = useState('');
  const [pListedAuthCodeValid, setPListedAuthCodeValid] = useState(false);
  const [expandedServiceTypes, setExpandedServiceTypes] = useState<Set<string>>(new Set());
  const [serviceTypeTimeEntries, setServiceTypeTimeEntries] = useState<Map<string, ServiceTypeTimeEntry>>(new Map());
  const [showServiceTypeSelectionModal, setShowServiceTypeSelectionModal] = useState(false);
  const [pendingOrderForServiceTypeSelection, setPendingOrderForServiceTypeSelection] = useState<OrderData | null>(null);
  const isSelectingServiceTypeRef = useRef(false);
  const [activeServiceTypeTimer, setActiveServiceTypeTimer] = useState<string | null>(null); // serviceTypeId that's currently timing
  const [showTimeEditModal, setShowTimeEditModal] = useState(false);
  const [editingServiceTypeId, setEditingServiceTypeId] = useState<string | null>(null);
  const [editingTimeField, setEditingTimeField] = useState<'start' | 'end' | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState({hours: '12', minutes: '00', ampm: 'AM'});
  const [selectedStream, setSelectedStream] = useState('Hazardous Waste');
  const [selectedStreamCode, setSelectedStreamCode] = useState('D001');
  const [selectedStreamId, setSelectedStreamId] = useState('D001');
  const [selectedContainerType, setSelectedContainerType] =
    useState<ContainerType | null>(null);
  const [streamSearchQuery, setStreamSearchQuery] = useState('');
  const [tareWeight, setTareWeight] = useState('45');
  const [scaleWeight, setScaleWeight] = useState('');
  const [grossWeight, setGrossWeight] = useState('285');
  const [barcode, setBarcode] = useState('');
  const [cylinderCount, setCylinderCount] = useState('');
  const [recentlyUsedProfiles, setRecentlyUsedProfiles] = useState<string[]>(['D001', 'U001', 'N001', 'HT001']);
  const [isManualWeightEntry, setIsManualWeightEntry] = useState(false);
  const [isScaleConnected, setIsScaleConnected] = useState(true); // Default to online for simulation
  const [scaleReading, setScaleReading] = useState<number | null>(null); // Simulated integer reading
  const [completedOrders, setCompletedOrders] = useState<string[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<
    Record<string, OrderData['status']>
  >({});
  /** Container status: loaded/in_transit = active on truck; dropped = removed at transfer (FR-3a.EXT.3.3). */
  const [addedContainers, setAddedContainers] = useState<
    Array<{
      id: string;
      streamName: string;
      streamCode: string;
      containerType: string;
      containerSize: string;
      barcode: string;
      tareWeight: string;
      grossWeight: string;
      netWeight: number;
      isManualEntry?: boolean;
      shippingLabelBarcode?: string;
      status?: 'loaded' | 'in_transit' | 'dropped';
    }>
  >([]);
  const [selectedPrograms, setSelectedPrograms] = useState<
    Record<string, 'ship' | 'noship'>
  >({});
  const [manifestTrackingNumber, setManifestTrackingNumber] = useState<
    string | null
  >(null);
  const [manifestData, setManifestData] = useState<{
    trackingNumber?: string;
    createdAt?: Date;
    scannedImageUri?: string;
    signatureImageUri?: string;
  } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const signatureRef = useRef<any>(null);
  const [materialsSupplies, setMaterialsSupplies] = useState<
    Array<{
      id: string;
      itemNumber: string;
      description: string;
      quantity: number;
      type: 'used' | 'left_behind';
    }>
  >([]);
  // Material modal state - moved to parent to persist across re-renders
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [selectedMaterialItem, setSelectedMaterialItem] = useState<{
    itemNumber: string;
    description: string;
  } | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState('1');
  const [materialType, setMaterialType] = useState<'used' | 'left_behind'>(
    'used',
  );
  const [showAddMaterialSuccess, setShowAddMaterialSuccess] = useState(false);
  
  // Handler for adding materials - moved to parent to prevent modal remounting
  const handleAddMaterial = useCallback(() => {
    if (!selectedMaterialItem) return;
    const newMaterial = {
      id: `mat-${Date.now()}`,
      itemNumber: selectedMaterialItem.itemNumber,
      description: selectedMaterialItem.description,
      quantity: parseInt(materialQuantity) || 1,
      type: materialType,
    };

    // Update materials list and reset form in the same batch
    setMaterialsSupplies(prev => [...prev, newMaterial]);
    setSelectedMaterialItem(null);
    setMaterialQuantity('1');
    setMaterialType('used');

    // Show success indicator
    setShowAddMaterialSuccess(true);
    setTimeout(() => setShowAddMaterialSuccess(false), 2000);
  }, [selectedMaterialItem, materialQuantity, materialType]);

  const [showLabelPrinting, setShowLabelPrinting] = useState(false);
  const [printingLabelBarcode, setPrintingLabelBarcode] = useState('');
  const [scannedDocuments, setScannedDocuments] = useState<
    Array<{
      id: string;
      uri: string;
      timestamp: string;
      orderNumber: string;
      documentType: 'manifest' | 'ldr' | 'bol';
    }>
  >([]);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);
  const [pendingDocumentType, setPendingDocumentType] = useState<'manifest' | 'ldr' | 'bol' | null>(null);
  const [showScannedDocumentsViewer, setShowScannedDocumentsViewer] = useState(false);
  const [showDropWasteModal, setShowDropWasteModal] = useState(false);
  const [showDocumentOptionsMenu, setShowDocumentOptionsMenu] = useState(false);
  const [showCaptureMethodSelector, setShowCaptureMethodSelector] = useState(false);
  const [equipmentPPE, setEquipmentPPE] = useState<
    Array<{
      id: string;
      name: string;
      count: number;
    }>
  >([]);
  const [useMasterDetail, setUseMasterDetail] = useState(true); // Toggle for master-detail view (default: true)
  const [dashboardSelectedOrder, setDashboardSelectedOrder] =
    useState<OrderData | null>(null); // Selected order in master-detail view
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // No-Ship reason capture (FR-3a.UI.8.3): per order + service type
  const [noshipByOrderAndServiceType, setNoshipByOrderAndServiceType] = useState<
    Record<string, Record<string, NoShipRecord>>
  >({});
  const [noShipReasonOrderNumber, setNoShipReasonOrderNumber] = useState<string | null>(null);
  const [noShipReasonServiceTypeId, setNoShipReasonServiceTypeId] = useState<string | null>(null);
  const [noShipReasonCode, setNoShipReasonCode] = useState<NoShipReasonCode | ''>('');
  const [noShipReasonNotes, setNoShipReasonNotes] = useState('');
  // Start Service modal: which service type is selected to start (single selection)
  const [selectedServiceTypeToStart, setSelectedServiceTypeToStart] = useState<string | null>(null);

  // FR-3a.EXT.3.2/3.3: Active = Loaded/In-Transit (not dropped); aggregation from active only
  const activeContainers = useMemo(
    () => addedContainers.filter(c => c.status !== 'dropped'),
    [addedContainers],
  );
  const currentTotalWeight = useMemo(
    () => activeContainers.reduce((sum, c) => sum + c.netWeight, 0),
    [activeContainers],
  );
  const activeContainerCount = activeContainers.length;
  const transferLocationOptions = useMemo(() => {
    const defaultName = serviceCenter?.name ?? '';
    const approved = APPROVED_TRANSFER_LOCATIONS;
    if (!defaultName) return approved;
    const rest = approved.filter(l => l !== defaultName);
    return [defaultName, ...rest];
  }, [serviceCenter?.name]);

  // Subscribe to offline status changes
  useEffect(() => {
    const unsubscribe = offlineTrackingService.onStatusChange(setOfflineStatus);
    return unsubscribe;
  }, []);

  // Subscribe to Service Center changes
  useEffect(() => {
    let previousName: string | null = serviceCenter?.name || null;
    
    const unsubscribe = serviceCenterService.onServiceCenterChange((newServiceCenter) => {
      // Show notification if Service Center changed
      if (previousName && newServiceCenter && previousName !== newServiceCenter.name) {
        setUpdatedServiceCenterName(newServiceCenter.name);
        setShowServiceCenterUpdateNotification(true);
        setTimeout(() => setShowServiceCenterUpdateNotification(false), 3000);
      }
      
      previousName = newServiceCenter?.name || null;
      setServiceCenter(newServiceCenter);
    });
    return unsubscribe;
  }, []);

  // Subscribe to photo changes for current order
  useEffect(() => {
    if (!selectedOrderData) {
      setOrderPhotos([]);
      return;
    }

    const unsubscribe = photoService.onPhotosChange(
      selectedOrderData.orderNumber,
      (photos) => {
        setOrderPhotos(photos);
      }
    );

    return unsubscribe;
  }, [selectedOrderData?.orderNumber]);

  // Load service type time entries when order changes
  useEffect(() => {
    if (!selectedOrderData || !username) {
      setServiceTypeTimeEntries(new Map());
      setExpandedServiceTypes(new Set());
      return;
    }

    const entries = new Map<string, ServiceTypeTimeEntry>();
    selectedOrderData.programs.forEach(serviceTypeId => {
      const entry = serviceTypeTimeService.getTimeEntry(
        selectedOrderData.orderNumber,
        serviceTypeId,
      );
      if (entry) {
        entries.set(serviceTypeId, entry);
      }
    });
    setServiceTypeTimeEntries(entries);
  }, [selectedOrderData, username]);

  const [truckId, setTruckId] = useState<string>(''); // Keep for backward compatibility
  const [selectedTruck, setSelectedTruck] = useState<{number: string; description?: string} | null>(null);
  const [selectedTrailer, setSelectedTrailer] = useState<{number: string; description?: string} | null>(null);
  const [activeTimeTracking, setActiveTimeTracking] = useState<TimeTrackingRecord | null>(null);
  const [currentOrderTimeTracking, setCurrentOrderTimeTracking] = useState<TimeTrackingRecord | null>(null);
  const [elapsedTimeDisplay, setElapsedTimeDisplay] = useState<string>('');
  const [showPauseReasonModal, setShowPauseReasonModal] = useState(false);
  const [pauseReasonSelection, setPauseReasonSelection] = useState('');

  // Use the mock orders
  const orders = MOCK_ORDERS;

  // Helper function to extract store number from site field
  const extractStoreNumber = (site: string): string | null => {
    if (!site) return null;
    // Match patterns like "Store #1234", "#1234", "Store 1234", etc.
    const match = site.match(/#?\s*(\d+)/);
    return match ? match[1] : null;
  };

  // Helper function to format customer name with store number
  const formatCustomerWithStore = (customer: string, site: string): string => {
    const storeNumber = extractStoreNumber(site);
    if (storeNumber) {
      return `${customer} - Store #${storeNumber}`;
    }
    return customer;
  };

  // Helper function to format phone number as (XXX) XXX-XXXX
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Return original if not 10 digits
    return phone;
  };

  // Active service location for Drop Waste modal (selected order's address and contact phone; fallback when transfer location has no details)
  const dropModalServiceLocation = useMemo(() => {
    const activeOrder = selectedOrderData ?? dashboardSelectedOrder ?? orders?.[0] ?? null;
    if (!activeOrder) return { address: null as string | null, phone: null as string | null };
    const parts = [activeOrder.site, activeOrder.city, activeOrder.state, activeOrder.zip].filter(Boolean);
    const address = parts.length > 0 ? parts.join(', ') : null;
    const phone = activeOrder.primaryContactPhone ? formatPhoneNumber(activeOrder.primaryContactPhone) : null;
    return { address, phone };
  }, [selectedOrderData, dashboardSelectedOrder, orders]);

  // Transfer location -> address/phone for Drop Waste modal; when selection changes, displayed info updates
  const transferLocationDetails = useMemo(() => {
    if (!serviceCenter?.name) return undefined;
    const details: Record<string, { address: string | null; phone: string | null }> = {};
    details[serviceCenter.name] = {
      address: serviceCenter.address ?? null,
      phone: null,
    };
    return details;
  }, [serviceCenter?.name, serviceCenter?.address]);

  // Handle phone call
  const handlePhoneCall = useCallback(async (phone: string) => {
    if (!phone) return;
    const phoneNumber = phone.replace(/\D/g, ''); // Remove non-digits
    const url = `tel:${phoneNumber}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to make phone call');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to make phone call');
    }
  }, []);

  // Handle email
  const handleEmail = useCallback(async (email: string) => {
    if (!email) return;
    const url = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email client');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open email client');
    }
  }, []);

  // Load truck ID for the user
  const loadTruckId = useCallback(async () => {
    if (!username) return;
    try {
      const id = await getUserTruckId(username);
      if (id) {
        setTruckId(id);
      }
    } catch (error) {
      console.error('Error loading truck ID:', error);
    }
  }, [username]);

  const getElapsedTimeDisplay = useCallback((record?: TimeTrackingRecord | null) => {
    if (!record) return '';
    const now = record.pausedAt ? record.pausedAt : Date.now();
    const pausedMs = record.totalPausedMs || 0;
    const elapsedMs = Math.max(0, now - record.startTime - pausedMs);
    return formatDuration(elapsedMs);
  }, []);

  const pauseReasonOptions = [
    'Break/Lunch',
    'Waiting on access',
    'Equipment issue',
    'Traffic/Delay',
    'Safety concern',
    'Other',
  ];
  
  // Load truck and time tracking on mount and when username changes
  useEffect(() => {
    loadTruckId();
    loadActiveTimeTracking();
  }, [username]);

  // Reload truck ID when returning to dashboard (e.g., after saving in Settings)
  useEffect(() => {
    if (currentStep === 'dashboard') {
      loadTruckId();
    }
  }, [currentStep, loadTruckId]);



  // Load active time tracking
  const loadActiveTimeTracking = useCallback(async () => {
    try {
      const active = await getActiveTimeTracking();
      setActiveTimeTracking(active);
      if (active) {
        setElapsedTimeDisplay(getElapsedTimeDisplay(active));
      } else {
        setElapsedTimeDisplay('');
      }
    } catch (error) {
      console.error('Error loading active time tracking:', error);
    }
  }, [getElapsedTimeDisplay]);

  // Load active time tracking on mount
  useEffect(() => {
    loadActiveTimeTracking();
  }, [loadActiveTimeTracking]);

  // Load time tracking for current order (selectedOrderData or dashboardSelectedOrder)
  const loadCurrentOrderTimeTracking = useCallback(async () => {
    // Priority: selectedOrderData (when in workflow) > dashboardSelectedOrder (master-detail view)
    const currentOrder = selectedOrderData || dashboardSelectedOrder;
    if (!currentOrder) {
      setCurrentOrderTimeTracking(null);
      setElapsedTimeDisplay('');
      return;
    }

    try {
      const tracking = await getTimeTrackingForOrder(currentOrder.orderNumber);
      setCurrentOrderTimeTracking(tracking);
      if (tracking && !tracking.endTime) {
        // Only show if still active (no endTime means still in progress)
        setElapsedTimeDisplay(getElapsedTimeDisplay(tracking));
      } else {
        setCurrentOrderTimeTracking(null);
        setElapsedTimeDisplay('');
      }
    } catch (error) {
      console.error('Error loading current order time tracking:', error);
      setCurrentOrderTimeTracking(null);
      setElapsedTimeDisplay('');
    }
  }, [selectedOrderData, dashboardSelectedOrder, getElapsedTimeDisplay]);

  // Load time tracking when order changes
  useEffect(() => {
    loadCurrentOrderTimeTracking();
  }, [loadCurrentOrderTimeTracking]);

  // Update elapsed time display every minute for current order
  useEffect(() => {
    if (!currentOrderTimeTracking || currentOrderTimeTracking.endTime) {
      setElapsedTimeDisplay('');
      return;
    }

    // Update immediately
    setElapsedTimeDisplay(getElapsedTimeDisplay(currentOrderTimeTracking));

    if (currentOrderTimeTracking.pausedAt) {
      return;
    }

    // Update every minute
    const interval = setInterval(() => {
      if (currentOrderTimeTracking && !currentOrderTimeTracking.endTime) {
        setElapsedTimeDisplay(getElapsedTimeDisplay(currentOrderTimeTracking));
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentOrderTimeTracking, getElapsedTimeDisplay]);

  // Update active service type timer display every minute
  useEffect(() => {
    if (!activeServiceTypeTimer || !selectedOrderData) {
      return;
    }

    const timeEntry = serviceTypeTimeEntries.get(activeServiceTypeTimer);
    if (!timeEntry || !timeEntry.startTime || timeEntry.endTime) {
      return;
    }

    // Force re-render of service type rows to update elapsed time
    const interval = setInterval(() => {
      // Trigger re-render by updating a dummy state or reloading entries
      const updated = new Map(serviceTypeTimeEntries);
      setServiceTypeTimeEntries(updated);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeServiceTypeTimer, selectedOrderData, serviceTypeTimeEntries]);


  // Helper function to get order status (checks both original status and completed state)
  const getOrderStatus = useCallback(
    (order: OrderData): OrderData['status'] => {
      if (completedOrders.includes(order.orderNumber)) {
        return 'Completed';
      }
      return orderStatuses[order.orderNumber] || order.status || 'Scheduled';
    },
    [completedOrders, orderStatuses],
  );

  // Helper function to check if order is completed
  const isOrderCompleted = useCallback(
    (orderNumber: string): boolean => {
      return completedOrders.includes(orderNumber);
    },
    [completedOrders],
  );

  const hasOrderNotes = useCallback((order: OrderData): boolean => {
    return Boolean(
      order.customerSpecialInstructions ||
        order.siteAccessNotes ||
        (order.safetyWarnings && order.safetyWarnings.length > 0) ||
        (order.previousServiceNotes && order.previousServiceNotes.length > 0),
    );
  }, []);

  const upcomingOrders = useMemo(() => {
    const allOrders = MOCK_ORDERS || orders || [];
    return allOrders.filter(order => !isOrderCompleted(order.orderNumber));
  }, [orders, isOrderCompleted]);

  const upcomingOrdersWithNotes = useMemo(() => {
    return upcomingOrders.filter(order => hasOrderNotes(order));
  }, [upcomingOrders, hasOrderNotes]);

  // Initialize master-detail view: auto-select first order if using master-detail and no order is selected
  // Only in landscape mode for better UX
  useEffect(() => {
    if (useMasterDetail && isTablet() && isLandscape() && !dashboardSelectedOrder && currentStep === 'dashboard') {
      const allOrders = MOCK_ORDERS || orders || [];
      const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
      if (activeOrders.length > 0) {
        setDashboardSelectedOrder(activeOrders[0]);
      } else if (allOrders.length > 0) {
        // If no active orders, select the first order anyway
        setDashboardSelectedOrder(allOrders[0]);
      }
    }
  }, [useMasterDetail, dashboardSelectedOrder, currentStep, isOrderCompleted]);

  // Sync service integration
  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncService.onStatusChange(status => {
      setSyncStatus(status);
      setPendingSyncCount(syncService.getPendingCount());
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle manual sync
  const handleManualSync = useCallback(async () => {
    try {
      await syncService.manualSync();
      Alert.alert('Success', 'Data synced successfully');
    } catch (error: any) {
      Alert.alert(
        'Sync Failed',
        error.message || 'Unable to sync. Please check your connection.',
      );
    }
  }, []);

  // Proceed with starting service after acknowledgment
  const proceedWithStartService = useCallback(async (order: OrderData) => {
    try {
      // Start order-level time tracking (overall order time)
      await startTimeTracking(order.orderNumber, truckId, username);
      
      // Load the active tracking to update UI
      const active = await getActiveTimeTracking();
      setActiveTimeTracking(active);
      
      // Load time tracking for this specific order
      const orderTracking = await getTimeTrackingForOrder(order.orderNumber);
      setCurrentOrderTimeTracking(orderTracking);
      if (orderTracking && !orderTracking.endTime) {
        setElapsedTimeDisplay(getElapsedTimeDisplay(orderTracking));
      }
      
      // Start the service type (should already be selected at this point)
      const serviceTypes = order.programs || [];
      if (serviceTypes.length === 1 && username) {
        // Single service type - start it immediately
        await serviceTypeTimeService.startServiceType(
          order.orderNumber,
          serviceTypes[0],
          username,
        );
        setActiveServiceTypeTimer(serviceTypes[0]);
        // Reload service type time entries
        const entries = new Map<string, ServiceTypeTimeEntry>();
        const entry = serviceTypeTimeService.getTimeEntry(
          order.orderNumber,
          serviceTypes[0],
        );
        if (entry) {
          entries.set(serviceTypes[0], entry);
        }
        setServiceTypeTimeEntries(entries);
        
        // Reset containers, materials, and equipment for new service type
        setAddedContainers([]);
        setMaterialsSupplies([]);
        setEquipmentPPE([]);
      }
      // Note: For multiple service types, the service type should already be started
      // via the selection modal before this function is called
      
      // Set selected order and navigate to stream selection
      setSelectedOrderData(order);
      setCurrentStep('stream-selection');
      
      // Update order status to "Partial" when starting
      setOrderStatuses(prev => ({
        ...prev,
        [order.orderNumber]: 'Partial',
      }));
      
      // Close modal if open
      setShowJobNotesModal(false);
    } catch (error) {
      console.error('Error starting time tracking:', error);
      // Still allow navigation even if tracking fails
      setSelectedOrderData(order);
      setCurrentStep('stream-selection');
      setShowJobNotesModal(false);
    }
  }, [truckId, username]);

  // Check if actions are blocked due to offline limit
  const checkOfflineBlock = useCallback((): boolean => {
    if (offlineStatus.isBlocked) {
      setShowOfflineBlockedModal(true);
      return true;
    }
    return false;
  }, [offlineStatus.isBlocked]);

  // Handle starting service - shows service type selection first if multiple service types
  const handleStartService = useCallback(async (order: OrderData) => {
    // Check if blocked due to offline limit
    if (checkOfflineBlock()) {
      return;
    }

    // Check if order has multiple service types - show selection modal first
    const serviceTypes = order.programs || [];
    if (serviceTypes.length > 1) {
      // Show service type selection modal on dashboard (FR-3a.UI.8.2)
      setPendingOrderForServiceTypeSelection(order);
      setSelectedServiceTypeToStart(null);
      setShowServiceTypeSelectionModal(true);
      return;
    }
    
    // Single service type or no service types - proceed with normal flow
    await proceedWithStartService(order);
  }, [truckId, username, proceedWithStartService, offlineStatus.isBlocked, checkOfflineBlock]);

  // No-Ship helpers (FR-3a.UI.8.3)
  const isServiceTypeNoShip = useCallback(
    (orderNumber: string, serviceTypeId: string): boolean =>
      Boolean(noshipByOrderAndServiceType[orderNumber]?.[serviceTypeId]),
    [noshipByOrderAndServiceType],
  );
  const setNoShipForServiceType = useCallback(
    (orderNumber: string, serviceTypeId: string, record: NoShipRecord) => {
      setNoshipByOrderAndServiceType(prev => ({
        ...prev,
        [orderNumber]: {
          ...(prev[orderNumber] ?? {}),
          [serviceTypeId]: record,
        },
      }));
    },
    [],
  );
  const clearNoShipForServiceType = useCallback(
    (orderNumber: string, serviceTypeId: string) => {
      setNoshipByOrderAndServiceType(prev => {
        const orderMap = prev[orderNumber];
        if (!orderMap) return prev;
        const next = {...orderMap};
        delete next[serviceTypeId];
        if (Object.keys(next).length === 0) {
          const nextAll = {...prev};
          delete nextAll[orderNumber];
          return nextAll;
        }
        return {...prev, [orderNumber]: next};
      });
    },
    [],
  );

  // FR-3a.UI.8.1: Service type badges (orange=pending, blue=in progress, gray=no-ship, green=completed)
  const serviceTypeBadgesForHeader = useMemo(() => {
    if (!selectedOrderData) return undefined;
    return selectedOrderData.programs.map(serviceTypeId => {
      const entry = serviceTypeTimeEntries.get(serviceTypeId);
      const hasStart = entry?.startTime != null;
      const hasEnd = entry?.endTime != null;
      const inProgress =
        activeServiceTypeTimer === serviceTypeId || (hasStart && !hasEnd);
      const completed = hasStart && hasEnd;
      const noship = isServiceTypeNoShip(
        selectedOrderData.orderNumber,
        serviceTypeId,
      );
      return {
        serviceTypeId,
        srNumber: selectedOrderData.serviceOrderNumbers?.[serviceTypeId],
        status: noship
          ? ('noship' as const)
          : completed
            ? ('completed' as const)
            : inProgress
              ? ('in_progress' as const)
              : ('pending' as const),
      };
    });
  }, [
    selectedOrderData,
    serviceTypeTimeEntries,
    activeServiceTypeTimer,
    isServiceTypeNoShip,
  ]);

  const handleServiceTypeBadgePress = useCallback(
    (serviceTypeId: string) => {
      if (!selectedOrderData) return;
      // Navigate to that service type's context (e.g. stream selection; detail view)
      setCurrentStep('stream-selection');
    },
    [selectedOrderData],
  );

  const handleRequestPause = useCallback(() => {
    if (activeTimeTracking?.pausedAt) {
      Alert.alert('Already Paused', 'Time tracking is already paused.');
      return;
    }
    if (!activeTimeTracking && !currentOrderTimeTracking) {
      Alert.alert('No Active Timer', 'There is no active time tracking to pause.');
      return;
    }
    setPauseReasonSelection('');
    setShowPauseReasonModal(true);
  }, [activeTimeTracking, currentOrderTimeTracking]);

  const handleConfirmPause = useCallback(async () => {
    const reason = pauseReasonSelection.trim();
    if (!reason) {
      Alert.alert('Reason Required', 'Please select a reason for pausing.');
      return;
    }

    const orderNumber =
      activeTimeTracking?.orderNumber || currentOrderTimeTracking?.orderNumber;
    if (!orderNumber) {
      Alert.alert('Unable to Pause', 'No active time tracking found.');
      return;
    }

    try {
      const updated = await pauseTimeTracking(orderNumber, reason);
      if (updated) {
        setActiveTimeTracking(updated);
        if (currentOrderTimeTracking?.orderNumber === orderNumber) {
          setCurrentOrderTimeTracking(updated);
        }
        setElapsedTimeDisplay(getElapsedTimeDisplay(updated));
      }
      setShowPauseReasonModal(false);
      setPauseReasonSelection('');
    } catch (error) {
      console.error('Error pausing time tracking:', error);
      Alert.alert('Error', 'Failed to pause time tracking.');
    }
  }, [
    pauseReasonSelection,
    activeTimeTracking,
    currentOrderTimeTracking,
    getElapsedTimeDisplay,
  ]);

  const handleResumeTracking = useCallback(async () => {
    const orderNumber =
      activeTimeTracking?.orderNumber || currentOrderTimeTracking?.orderNumber;
    if (!orderNumber) {
      Alert.alert('Unable to Continue', 'No active time tracking found.');
      return;
    }

    try {
      const updated = await resumeTimeTracking(orderNumber);
      if (updated) {
        setActiveTimeTracking(updated);
        if (currentOrderTimeTracking?.orderNumber === orderNumber) {
          setCurrentOrderTimeTracking(updated);
        }
        setElapsedTimeDisplay(getElapsedTimeDisplay(updated));
      }
    } catch (error) {
      console.error('Error resuming time tracking:', error);
      Alert.alert('Error', 'Failed to resume time tracking.');
    }
  }, [activeTimeTracking, currentOrderTimeTracking, getElapsedTimeDisplay]);

  // Generate unique shipping label barcode
  // Format: I-8digitssalesorder-001 (e.g., I-20241234-001)
  const generateShippingLabelBarcode = useCallback(
    (orderNumber: string, containerIndex: number): string => {
      // Extract numeric part from order number (e.g., "WO-2024-1234" -> "20241234")
      // Or use the last 8 digits if available
      const numericMatch = orderNumber.match(/\d+/g);
      let salesOrderDigits = '00000000';

      if (numericMatch) {
        // Combine all numeric parts and take last 8 digits
        const combined = numericMatch.join('');
        salesOrderDigits = combined.slice(-8).padStart(8, '0');
      }

      // Container number is 3 digits, zero-padded (001, 002, etc.)
      const containerNumber = String(containerIndex + 1).padStart(3, '0');

      return `I-${salesOrderDigits}-${containerNumber}`;
    },
    [],
  );

  // Print shipping label via thermal printer
  const printShippingLabel = useCallback(
    async (container: {
      shippingLabelBarcode?: string;
      streamName: string;
      containerSize: string;
      containerType: string;
      netWeight: number;
      tareWeight: string;
      grossWeight: string;
    }) => {
      if (!container.shippingLabelBarcode) {
        Alert.alert('Error', 'Shipping label barcode not found');
        return;
      }

      try {
        // TODO: Implement actual thermal printer integration
        // This would use a library like react-native-thermal-printer
        // or a native module for Zebra/Honeywell printers

        // For now, show a placeholder alert
        Alert.alert(
          'Printing Label',
          `Shipping label barcode: ${container.shippingLabelBarcode}\n\nThermal printer integration will be implemented here.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // In production, this would trigger actual printing
                console.log('Printing label:', {
                  barcode: container.shippingLabelBarcode,
                  stream: container.streamName,
                  size: container.containerSize,
                  type: container.containerType,
                  netWeight: container.netWeight,
                  tareWeight: container.tareWeight,
                  grossWeight: container.grossWeight,
                });
              },
            },
          ],
        );
      } catch (error: any) {
        Alert.alert(
          'Print Error',
          error.message || 'Failed to print label. Please try again.',
        );
      }
    },
    [],
  );

  // Generate manifest tracking number (tied to label printing to prevent discrepancies)
  const generateManifestTrackingNumber = useCallback(() => {
    // Format: M-YYYYMMDD-HHMMSS-XXX (e.g., M-20241215-143022-001)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(
      3,
      '0',
    );

    return `M-${year}${month}${day}-${hours}${minutes}${seconds}-${sequence}`;
  }, []);

  // Assign tracking number when labels are printed
  const assignTrackingNumberOnLabelPrint = useCallback(() => {
    if (!manifestTrackingNumber) {
      const trackingNumber = generateManifestTrackingNumber();
      setManifestTrackingNumber(trackingNumber);
      setManifestData(prev => ({
        ...prev,
        trackingNumber,
        createdAt: new Date(),
      }));
      return trackingNumber;
    }
    return manifestTrackingNumber;
  }, [manifestTrackingNumber, generateManifestTrackingNumber]);

  // Print manifest
  const printManifest = useCallback(async () => {
    try {
      // Assign tracking number when printing (to prevent discrepancies)
      const trackingNumber = assignTrackingNumberOnLabelPrint();

      // TODO: Implement actual thermal printer integration for manifest
      Alert.alert(
        'Printing Manifest',
        `Tracking Number: ${trackingNumber}\n\nManifest printer integration will be implemented here.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Printing manifest:', {
                trackingNumber,
                orderNumber: selectedOrderData?.orderNumber,
                containers: addedContainers,
                programs: selectedPrograms,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Print Error',
        error.message || 'Failed to print manifest. Please try again.',
      );
    }
  }, [
    assignTrackingNumberOnLabelPrint,
    selectedOrderData,
    addedContainers,
    selectedPrograms,
  ]);

  // Print LDR (Land Disposal Restriction)
  const printLDR = useCallback(async () => {
    try {
      const trackingNumber =
        manifestTrackingNumber || assignTrackingNumberOnLabelPrint();

      // TODO: Implement actual thermal printer integration for LDR
      Alert.alert(
        'Printing LDR',
        `Tracking Number: ${trackingNumber}\n\nLDR printer integration will be implemented here.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Printing LDR:', {
                trackingNumber,
                orderNumber: selectedOrderData?.orderNumber,
                containers: addedContainers,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Print Error',
        error.message || 'Failed to print LDR. Please try again.',
      );
    }
  }, [
    manifestTrackingNumber,
    assignTrackingNumberOnLabelPrint,
    selectedOrderData,
    addedContainers,
  ]);

  // Void manifest
  const voidManifest = useCallback(() => {
    Alert.alert(
      'Void Manifest',
      'Are you sure you want to void this manifest? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Void',
          style: 'destructive',
          onPress: () => {
            setManifestTrackingNumber(null);
            setManifestData(null);
            setSelectedPrograms({});
            Alert.alert('Success', 'Manifest has been voided.');
          },
        },
      ],
    );
  }, []);

  // Scan manifest with camera
  const scanManifestWithCamera = useCallback(async () => {
    try {
      // TODO: Implement camera integration
      // This would use react-native-image-picker or expo-image-picker
      Alert.alert(
        'Camera Scan',
        'Camera integration will be implemented here. This will allow scanning and uploading manifest documents.',
        [
          {
            text: 'OK',
            onPress: () => {
              // In production, this would:
              // 1. Open camera
              // 2. Capture image
              // 3. Upload to server
              // 4. Store URI in manifestData
              const mockImageUri = 'file:///mock/manifest-scan.jpg';
              setManifestData(prev => ({
                ...prev,
                scannedImageUri: mockImageUri,
              }));
              console.log('Manifest scanned and uploaded:', mockImageUri);
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Scan Error',
        error.message || 'Failed to scan manifest. Please try again.',
      );
    }
  }, []);

  const allContainerTypes: ContainerType[] = [
    {
      id: '5G',
      size: '5 Gallon Pail',
      capacity: '5 gal',
      code: '5G',
      weight: '40 lbs max',
      popular: false,
    },
    {
      id: '30G',
      size: '30 Gallon Drum',
      capacity: '30 gal',
      code: '30G',
      weight: '250 lbs max',
      popular: true,
    },
    {
      id: '55G',
      size: '55 Gallon Drum',
      capacity: '55 gal',
      code: '55G',
      weight: '400 lbs max',
      popular: true,
    },
    {
      id: '85G',
      size: '85 Gallon Overpack',
      capacity: '85 gal',
      code: '85G',
      weight: '600 lbs max',
      popular: false,
    },
    {
      id: '95T',
      size: '95 Gallon Tote',
      capacity: '95 gal',
      code: '95T',
      weight: '800 lbs max',
      popular: false,
    },
    {
      id: 'CYLINDER',
      size: 'Gas Cylinder',
      capacity: 'Varies',
      code: 'CYL',
      weight: 'Varies',
      popular: false,
    },
  ];

  const wasteStreams: WasteStream[] = [
    {
      id: 'D001',
      profileName: 'Hazardous Waste',
      profileNumber: '243030001',
      category: 'Hazardous',
      hazardClass: 'Class 8',
      consolidationAllowed: true,
      accumulationsApply: true,
      specialInstructions: 'Handle with care',
      flags: ['Flammable', 'Toxic'],
      containerCount: 5,
      allowedContainers: ['30G', '55G', '85G'],
      requiresCylinderCount: true, // Example: This profile requires cylinder count
    },
    {
      id: 'P001',
      profileName: 'P-Listed Acute Hazardous Waste',
      profileNumber: '245010010',
      category: 'Hazardous',
      hazardClass: 'Class 6.1',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'P-Listed waste - requires special authorization',
      flags: ['P-Listed', 'Acute Hazardous', 'Toxic'],
      containerCount: 2,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
      wasteCodes: ['P001', 'P012'], // P-Listed codes
    },
    {
      id: 'U001',
      profileName: 'Universal Waste - Lamps',
      profileNumber: '241010002',
      category: 'Universal',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'Store in designated area',
      flags: ['Non-Hazardous'],
      containerCount: 3,
      allowedContainers: ['1YD', '2YD', '4YD'],
      requiresCylinderCount: false,
    },
    {
      id: 'N001',
      profileName: 'Non-Hazardous Solid Waste',
      profileNumber: '242050003',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Regular disposal',
      flags: ['Recyclable'],
      containerCount: 2,
      allowedContainers: ['5G', '30G', '55G', '95T', 'BULK'],
      requiresCylinderCount: false,
    },
    {
      id: 'HT001',
      profileName: 'Helium Tank',
      profileNumber: '244500004',
      category: 'Hazardous',
      hazardClass: 'Class 2.2',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Handle compressed gas cylinders with care. Ensure proper valve protection.',
      flags: ['Compressed Gas', 'Non-Flammable'],
      containerCount: 1,
      allowedContainers: ['CYLINDER'],
      requiresCylinderCount: true, // Helium Tank profile requires cylinder count
    },
    // Additional test profiles
    {
      id: 'D002',
      profileName: 'Corrosive Waste',
      profileNumber: '241270005',
      category: 'Hazardous',
      hazardClass: 'Class 8',
      consolidationAllowed: true,
      accumulationsApply: true,
      specialInstructions: 'Handle corrosive materials with appropriate PPE',
      flags: ['Corrosive', 'Hazardous'],
      containerCount: 3,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'D003',
      profileName: 'Flammable Liquids',
      profileNumber: '243080006',
      category: 'Hazardous',
      hazardClass: 'Class 3',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Store away from ignition sources',
      flags: ['Flammable', 'Hazardous'],
      containerCount: 4,
      allowedContainers: ['5G', '30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'D004',
      profileName: 'Toxic Waste',
      profileNumber: '242250007',
      category: 'Hazardous',
      hazardClass: 'Class 6.1',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Toxic materials - use proper ventilation',
      flags: ['Toxic', 'Hazardous'],
      containerCount: 2,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'D005',
      profileName: 'Oxidizing Waste',
      profileNumber: '241560008',
      category: 'Hazardous',
      hazardClass: 'Class 5.1',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Keep away from combustible materials',
      flags: ['Oxidizing', 'Hazardous'],
      containerCount: 3,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'U002',
      profileName: 'Universal Waste - Batteries',
      profileNumber: '243030009',
      category: 'Universal',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Store batteries in designated containers',
      flags: ['Universal', 'Recyclable'],
      containerCount: 5,
      allowedContainers: ['5G', '30G'],
      requiresCylinderCount: false,
    },
    {
      id: 'U003',
      profileName: 'Universal Waste - Electronics',
      profileNumber: '241010010',
      category: 'Universal',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Handle electronic waste with care',
      flags: ['Universal', 'E-Waste'],
      containerCount: 2,
      allowedContainers: ['1YD', '2YD', '4YD'],
      requiresCylinderCount: false,
    },
    {
      id: 'U004',
      profileName: 'Universal Waste - Pesticides',
      profileNumber: '241890011',
      category: 'Universal',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Store in original containers when possible',
      flags: ['Universal', 'Pesticide'],
      containerCount: 1,
      allowedContainers: ['5G', '30G'],
      requiresCylinderCount: false,
    },
    {
      id: 'N002',
      profileName: 'Office Paper Waste',
      profileNumber: '242050012',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Standard recycling procedures',
      flags: ['Recyclable', 'Paper'],
      containerCount: 8,
      allowedContainers: ['1YD', '2YD', '4YD', 'BULK'],
      requiresCylinderCount: false,
    },
    {
      id: 'N003',
      profileName: 'Cardboard Waste',
      profileNumber: '243030013',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Flatten cardboard before disposal',
      flags: ['Recyclable', 'Cardboard'],
      containerCount: 6,
      allowedContainers: ['1YD', '2YD', '4YD', 'BULK'],
      requiresCylinderCount: false,
    },
    {
      id: 'N004',
      profileName: 'Food Waste',
      profileNumber: '241010014',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Compostable organic waste',
      flags: ['Organic', 'Compostable'],
      containerCount: 4,
      allowedContainers: ['30G', '55G', '95T'],
      requiresCylinderCount: false,
    },
    {
      id: 'N005',
      profileName: 'Plastic Waste',
      profileNumber: '242050015',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Separate by plastic type when possible',
      flags: ['Recyclable', 'Plastic'],
      containerCount: 7,
      allowedContainers: ['30G', '55G', '95T', 'BULK'],
      requiresCylinderCount: false,
    },
    // DEA Controlled Substance Waste Profiles
    {
      id: 'DEA001',
      profileName: 'DEA Controlled Substances - Schedule II',
      profileNumber: '245030017',
      category: 'DEA',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'DEA regulated controlled substances - requires DEA Form 41 and proper chain of custody documentation. Must be witnessed and documented at time of destruction.',
      flags: ['DEA Regulated', 'Controlled Substance', 'Schedule II'],
      containerCount: 2,
      allowedContainers: ['5G', '30G'],
      requiresCylinderCount: false,
      isDEARegulated: true,
    },
    {
      id: 'DEA002',
      profileName: 'DEA Controlled Substances - Schedule III/IV',
      profileNumber: '245030018',
      category: 'DEA',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'DEA regulated controlled substances - Schedule III/IV medications. Requires DEA Form 41 and proper documentation.',
      flags: ['DEA Regulated', 'Controlled Substance', 'Schedule III', 'Schedule IV'],
      containerCount: 3,
      allowedContainers: ['5G', '30G', '55G'],
      requiresCylinderCount: false,
      isDEARegulated: true,
    },
    {
      id: 'DEA003',
      profileName: 'DEA Controlled Substances - Narcotics',
      profileNumber: '245030019',
      category: 'DEA',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'DEA regulated narcotic controlled substances. Requires two-person verification, DEA Form 41, and witnessed destruction documentation.',
      flags: ['DEA Regulated', 'Controlled Substance', 'Narcotic', 'Schedule II'],
      containerCount: 1,
      allowedContainers: ['5G', '30G'],
      requiresCylinderCount: false,
      isDEARegulated: true,
    },
    {
      id: 'DEA004',
      profileName: 'DEA Controlled Substances - Mixed Schedule',
      profileNumber: '245030020',
      category: 'DEA',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'Mixed schedule controlled substances. All schedules must be documented separately. Requires complete DEA Form 41 documentation.',
      flags: ['DEA Regulated', 'Controlled Substance', 'Mixed Schedule'],
      containerCount: 4,
      allowedContainers: ['5G', '30G', '55G'],
      requiresCylinderCount: false,
      isDEARegulated: true,
    },
    {
      id: 'CG001',
      profileName: 'Nitrogen Tank',
      profileNumber: '244500016',
      category: 'Hazardous',
      hazardClass: 'Class 2.2',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Handle compressed gas cylinders with care',
      flags: ['Compressed Gas', 'Non-Flammable'],
      containerCount: 1,
      allowedContainers: ['CYLINDER'],
      requiresCylinderCount: true,
    },
    {
      id: 'CG002',
      profileName: 'Oxygen Tank',
      profileNumber: '241270017',
      category: 'Hazardous',
      hazardClass: 'Class 2.2',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Oxygen supports combustion - keep away from oil and grease',
      flags: ['Compressed Gas', 'Oxidizing'],
      containerCount: 1,
      allowedContainers: ['CYLINDER'],
      requiresCylinderCount: true,
    },
    {
      id: 'CG003',
      profileName: 'Acetylene Tank',
      profileNumber: '243080018',
      category: 'Hazardous',
      hazardClass: 'Class 2.1',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Highly flammable - handle with extreme care',
      flags: ['Compressed Gas', 'Flammable'],
      containerCount: 1,
      allowedContainers: ['CYLINDER'],
      requiresCylinderCount: true,
    },
    {
      id: 'D006',
      profileName: 'Infectious Waste',
      profileNumber: '242250019',
      category: 'Hazardous',
      hazardClass: 'Class 6.2',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Biohazard - use red bags and proper labeling',
      flags: ['Infectious', 'Biohazard'],
      containerCount: 2,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'D007',
      profileName: 'Radioactive Waste',
      profileNumber: '241560020',
      category: 'Hazardous',
      hazardClass: 'Class 7',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Radioactive materials - special handling required',
      flags: ['Radioactive', 'Hazardous'],
      containerCount: 1,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'D008',
      profileName: 'Reactive Waste',
      profileNumber: '243030021',
      category: 'Hazardous',
      hazardClass: 'Class 4.3',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Water-reactive materials - keep dry',
      flags: ['Reactive', 'Hazardous'],
      containerCount: 2,
      allowedContainers: ['30G', '55G'],
      requiresCylinderCount: false,
    },
    {
      id: 'N006',
      profileName: 'Metal Scrap',
      profileNumber: '241010022',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Separate ferrous and non-ferrous metals',
      flags: ['Recyclable', 'Metal'],
      containerCount: 10,
      allowedContainers: ['30G', '55G', '95T', 'BULK'],
      requiresCylinderCount: false,
    },
    {
      id: 'N007',
      profileName: 'Glass Waste',
      profileNumber: '242050023',
      category: 'Non-Haz',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Separate by color when possible',
      flags: ['Recyclable', 'Glass'],
      containerCount: 5,
      allowedContainers: ['30G', '55G', 'BULK'],
      requiresCylinderCount: false,
    },
    {
      id: 'U005',
      profileName: 'Universal Waste - Mercury',
      profileNumber: '244500024',
      category: 'Universal',
      consolidationAllowed: false,
      accumulationsApply: true,
      specialInstructions: 'Mercury-containing devices - handle with care',
      flags: ['Universal', 'Mercury'],
      containerCount: 1,
      allowedContainers: ['5G', '30G'],
      requiresCylinderCount: false,
    },
  ];

  // Get badge variant based on category
  const getCategoryBadgeVariant = (category: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('hazardous') && !categoryLower.includes('non')) {
      return 'destructive'; // Red for hazardous
    } else if (categoryLower.includes('universal')) {
      return 'secondary'; // Gray for universal
    } else if (categoryLower.includes('compressed')) {
      return 'default'; // Primary green for compressed gas
    } else {
      return 'outline'; // Outline for non-hazardous
    }
  };

  // Memoize filtered streams to prevent unnecessary re-renders
  // Sort to show recently used profiles first
  const filteredStreams = useMemo(() => {
    let streams = wasteStreams;
    
    // Filter by search query if provided
    if (streamSearchQuery.trim()) {
      const searchLower = streamSearchQuery.toLowerCase();
      streams = wasteStreams.filter(stream => {
        return (
          stream.profileName.toLowerCase().includes(searchLower) ||
          stream.profileNumber.toLowerCase().includes(searchLower) ||
          stream.category.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Sort: recently used first, then alphabetically by profile name
    return [...streams].sort((a, b) => {
      const aIndex = recentlyUsedProfiles.indexOf(a.id);
      const bIndex = recentlyUsedProfiles.indexOf(b.id);
      
      // If both are in recently used, maintain their order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is recently used, it comes first
      if (aIndex !== -1) return -1;
      // If only b is recently used, it comes first
      if (bIndex !== -1) return 1;
      // Neither is recently used, sort alphabetically
      return a.profileName.localeCompare(b.profileName);
    });
  }, [streamSearchQuery, recentlyUsedProfiles]);

  // Master-Detail Dashboard Screen (for tablets)
  const DashboardScreenMasterDetail = () => {
    const allOrders = MOCK_ORDERS || orders || [];
    // Show all orders, including completed ones
    const filteredOrders = allOrders;
    const selectedOrder = dashboardSelectedOrder || filteredOrders[0] || null;
    const isSelectedOrderCompleted = selectedOrder
      ? isOrderCompleted(selectedOrder.orderNumber)
      : false;
    const hasDetailNotes = Boolean(
      selectedOrder && (
        selectedOrder.customerSpecialInstructions ||
        selectedOrder.siteAccessNotes ||
        (selectedOrder.safetyWarnings && selectedOrder.safetyWarnings.length > 0) ||
        (selectedOrder.previousServiceNotes && selectedOrder.previousServiceNotes.length > 0)
      ),
    );
    const detailLastThreeNotes = selectedOrder?.previousServiceNotes
      ? selectedOrder.previousServiceNotes.slice(0, 3)
      : [];

    // Get offline limit warning message for header
    const getOfflineLimitMessage = () => {
      if (offlineStatus.isOnline) return null;

      const {warningLevel, offlineDurationMs} = offlineStatus;
      if (warningLevel === 'blocked') return null; // Modal handles this

      let messageText = '';
      let messageStyle = styles.offlineLimitMessage;
      let iconColor = colors.warning;

      if (warningLevel === 'critical') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
        if (remainingMinutes < 60) {
          messageText = `Critical: ${remainingMinutes} min remaining`;
        } else {
          const remainingHours = Math.floor(remainingMinutes / 60);
          const remainingMins = remainingMinutes % 60;
          messageText = `Critical: ${remainingHours} hr ${remainingMins} min remaining`;
        }
        messageStyle = styles.offlineLimitMessageCritical;
        iconColor = colors.destructive;
      } else if (warningLevel === 'orange') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        messageText = `Warning: ${remainingHours} hr ${remainingMins} min remaining`;
        messageStyle = styles.offlineLimitMessageOrange;
        iconColor = '#FF6B35';
      } else if (warningLevel === 'warning') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        messageText = `Warning: ${remainingHours} hr${remainingHours !== 1 ? 's' : ''} remaining`;
        messageStyle = styles.offlineLimitMessageWarning;
        iconColor = colors.warning;
      }

      if (!messageText) return null;

      return (
        <View style={messageStyle}>
          <Icon name="warning" size={14} color={iconColor} />
          <Text style={styles.offlineLimitMessageText}>{messageText}</Text>
        </View>
      );
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerContent}
              onPress={() => onNavigate?.('Settings')}
              activeOpacity={0.7}>
              <Text style={styles.headerTitle}>
                {username ? `Welcome, ${username}` : 'Welcome'}
              </Text>
              {selectedTruck ? (
                <View>
                  <Text style={styles.headerSubtitle}>
                    Truck: {selectedTruck.number}
                  </Text>
                  {selectedTrailer && (
                    <Text style={styles.headerSubtitle}>
                      Trailer: {selectedTrailer.number}
                    </Text>
                  )}
                </View>
              ) : truckId ? (
                <Text style={styles.headerSubtitle}>Truck: {truckId}</Text>
              ) : (
                <Text style={styles.headerSubtitle}>Set Vehicle</Text>
              )}
            </TouchableOpacity>
                        {serviceCenter && (
              <TouchableOpacity
                style={styles.serviceCenterBadge}
                onPress={() => setShowServiceCenterModal(true)}
                activeOpacity={0.7}>
                <Icon name="business" size={16} color={colors.primary} />
                <Text style={styles.serviceCenterText}>
                  {serviceCenterService.getDisplayFormat(false)}
                </Text>
              </TouchableOpacity>
            )}
            {getOfflineLimitMessage()}
          </View>
          <View style={styles.headerActions}>
            <View style={styles.headerSyncRow}>
              <View
                style={[
                  styles.syncStatus,
                  (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncStatusSynced,
                  syncStatus === 'syncing' && styles.syncStatusSyncing,
                  (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncStatusError,
                ]}>
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View
                    style={[
                      styles.syncDot,
                      (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncDotSynced,
                      (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncDotError,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.syncText,
                    (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncTextSynced,
                    (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncTextError,
                  ]}>
                  {syncStatus === 'syncing'
                    ? 'Syncing...'
                    : !offlineStatus.isOnline
                      ? 'Offline'
                      : syncStatus === 'error'
                        ? 'Connection failed'
                        : syncStatus === 'pending' && pendingSyncCount > 0
                          ? `Pending (${pendingSyncCount})`
                          : 'Synced'}
                </Text>
              </View>
              <Button
                title="Sync"
                variant="outline"
                size="sm"
                onPress={handleManualSync}
                disabled={syncStatus === 'syncing' || !offlineStatus.isOnline}
              />
            </View>
            <Button
              title="Drop"
              variant="primary"
              size="md"
              onPress={() => setShowDropWasteModal(true)}
            />
            <Button
              title="Full Screen"
              variant="ghost"
              size="sm"
              onPress={() => setUseMasterDetail(false)}
            />
            {onLogout && (
              <Button
                title="Logout"
                variant="ghost"
                size="sm"
                onPress={onLogout}
              />
            )}
          </View>
        </View>

        <View style={styles.runningTotalRow}>
          <Text style={styles.runningTotalLabel}>Running total:</Text>
          <Text style={styles.runningTotalValue}>
            {activeContainerCount} container{activeContainerCount !== 1 ? 's' : ''} • {currentTotalWeight.toLocaleString()} lbs
          </Text>
        </View>

        <View style={styles.masterDetailContainer}>
          {/* Master Pane - Orders List */}
          <View style={[styles.masterPane, {width: getSidebarWidth()}]}>
            <View style={styles.masterPaneHeader}>
              <View style={styles.masterPaneHeaderRow}>
                <Text style={styles.masterPaneTitle}>Upcoming Orders</Text>
                <Button
                  title={
                    upcomingOrdersWithNotes.length > 0
                      ? `View Notes (${upcomingOrdersWithNotes.length})`
                      : 'View Notes'
                  }
                  variant="outline"
                  size="sm"
                  onPress={() => setShowAllNotesModal(true)}
                />
              </View>
              <Text style={styles.masterPaneSubtitle}>
                {filteredOrders.length} orders scheduled
              </Text>
            </View>
            <ScrollView
              style={styles.masterPaneScroll}
              contentContainerStyle={styles.masterPaneContent}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.masterOrderItem,
                      dashboardSelectedOrder?.orderNumber ===
                        order.orderNumber && styles.masterOrderItemSelected,
                    ]}
                    onPress={() => setDashboardSelectedOrder(order)}
                    activeOpacity={0.7}>
                    <View style={styles.masterOrderItemHeader}>
                      <Text
                        style={[
                          styles.masterOrderNumber,
                          dashboardSelectedOrder?.orderNumber ===
                            order.orderNumber &&
                            styles.masterOrderNumberSelected,
                        ]}>
                        {order.orderNumber}
                      </Text>
                      <Badge
                        variant={
                          getOrderStatus(order) === 'Scheduled'
                            ? 'secondary'
                            : getOrderStatus(order) === 'Partial'
                              ? 'default'
                              : getOrderStatus(order) === 'In Progress'
                                ? 'default'
                                : getOrderStatus(order) === 'Completed'
                                  ? 'default'
                                  : 'destructive'
                        }
                        style={styles.masterOrderBadge}>
                        {getOrderStatus(order)}
                      </Badge>
                    </View>
                    <Text style={styles.masterOrderCustomer}>
                      {formatCustomerWithStore(order.customer, order.site)}
                    </Text>
                    <Text style={styles.masterOrderSite}>
                      {order.site} • {order.city}, {order.state}
                    </Text>
                    <Text style={styles.masterOrderTime}>
                      {order.serviceDate}
                    </Text>
                    {order.genNumber && (
                      <View style={styles.masterOrderBadges}>
                        {order.orderType && (
                          <Badge
                            variant="outline"
                            style={styles.masterOrderMetaBadge}>
                            {order.orderType}
                          </Badge>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No Orders Scheduled
                  </Text>
                  <Text style={styles.emptyStateText}>
                    You have no orders scheduled for today.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Detail Pane - Order Details */}
          <View style={styles.detailPane}>
            {selectedOrder ? (
              <ScrollView
                style={styles.detailPaneScroll}
                contentContainerStyle={styles.detailPaneContent}>
                <View style={styles.detailPaneHeader}>
                  <Text style={styles.detailPaneTitle}>
                    {selectedOrder.orderNumber}
                  </Text>
                  <Badge
                    variant={
                      getOrderStatus(selectedOrder) === 'Scheduled'
                        ? 'secondary'
                        : getOrderStatus(selectedOrder) === 'Partial'
                          ? 'default'
                          : getOrderStatus(selectedOrder) === 'In Progress'
                            ? 'default'
                            : getOrderStatus(selectedOrder) === 'Completed'
                              ? 'default'
                              : 'destructive'
                    }>
                    {getOrderStatus(selectedOrder)}
                  </Badge>
                </View>

                {/* Primary Contact Section - Prominently placed above the fold */}
                <Card style={styles.contactCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Primary Contact</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.primaryContactName ||
                    selectedOrder.primaryContactPhone ||
                    selectedOrder.primaryContactEmail ? (
                      <>
                        {selectedOrder.primaryContactName && (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Name:</Text>
                            <Text style={styles.contactValue}>
                              {selectedOrder.primaryContactName}
                            </Text>
                          </View>
                        )}
                        {selectedOrder.primaryContactPhone ? (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Phone:</Text>
                            <TouchableOpacity
                              onPress={() =>
                                handlePhoneCall(selectedOrder.primaryContactPhone!)
                              }
                              activeOpacity={0.7}>
                              <Text style={styles.contactLink}>
                                {formatPhoneNumber(selectedOrder.primaryContactPhone)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Phone:</Text>
                            <Text style={styles.contactValue}>—</Text>
                          </View>
                        )}
                        {selectedOrder.primaryContactEmail ? (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Email:</Text>
                            <TouchableOpacity
                              onPress={() =>
                                handleEmail(selectedOrder.primaryContactEmail!)
                              }
                              activeOpacity={0.7}>
                              <Text style={styles.contactLink}>
                                {selectedOrder.primaryContactEmail}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Email:</Text>
                            <Text style={styles.contactValue}>—</Text>
                          </View>
                        )}
                        {selectedOrder.hasSecondaryContacts && (
                          <TouchableOpacity
                            style={styles.viewAllContactsButton}
                            onPress={() => {
                              Alert.alert(
                                'All Contacts',
                                'Secondary contacts feature coming soon.',
                              );
                            }}
                            activeOpacity={0.7}>
  
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View style={styles.noContactContainer}>
                        <Text style={styles.noContactText}>
                          No contact on file
                        </Text>
                      </View>
                    )}
                  </CardContent>
                </Card>

                <Card style={styles.detailCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Order Information</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue}>
                          {selectedOrder.customer}
                        </Text>
                        {extractStoreNumber(selectedOrder.site) && (
                          <Text style={styles.storeNumber}>
                            Store #{extractStoreNumber(selectedOrder.site)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Site:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.site}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.site}
                        {selectedOrder.city && `, ${selectedOrder.city}`}
                        {selectedOrder.state && `, ${selectedOrder.state}`}
                        {selectedOrder.zip && ` ${selectedOrder.zip}`}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expected Date:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.serviceDate}
                      </Text>
                    </View>

                    {selectedOrder.orderType && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Order Type:</Text>
                        <Text style={styles.detailValue}>
                          {selectedOrder.orderType}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.programsDetailRow]}>
                      <Text style={styles.detailLabel}>Service Types:</Text>
                      <View style={styles.programsContainerInline}>
                        {selectedOrder.programs.map((program, i) => {
                          const serviceOrderNumber = selectedOrder.serviceOrderNumbers?.[program];
                          const noship = isServiceTypeNoShip(selectedOrder.orderNumber, program);
                          const entry = serviceTypeTimeEntries.get(program);
                          const hasStart = entry?.startTime != null;
                          const hasEnd = entry?.endTime != null;
                          const inProgress = activeServiceTypeTimer === program || (hasStart && !hasEnd);
                          const completed = !noship && hasStart && hasEnd;
                          const pending = !noship && !hasStart;
                          const badgeStyle = [
                            styles.programBadge,
                            noship && styles.programBadgeNoship,
                            completed && styles.programBadgeCompleted,
                            inProgress && styles.programBadgeInProgress,
                            pending && styles.programBadgePending,
                          ].filter(Boolean) as ViewStyle[];
                          const textStyle = noship
                            ? styles.programBadgeTextNoship
                            : completed
                              ? styles.programBadgeTextCompleted
                              : inProgress
                                ? styles.programBadgeTextInProgress
                                : styles.programBadgeTextPending;
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              style={StyleSheet.flatten(badgeStyle)}
                              textStyle={textStyle}
                              title={serviceTypeService.getServiceTypeName(program)}>
                              {serviceOrderNumber
                                ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                                : serviceTypeService.formatForBadge(program)}
                            </Badge>
                          );
                        })}
                      </View>
                    </View>
                  </CardContent>
                </Card>

                <View style={styles.detailNotesSection}>
                  <View style={styles.detailNotesHeader}>
                    <Text style={styles.detailNotesTitle}>Service Notes</Text>
                    {hasDetailNotes && (
                      <Badge variant="secondary" style={styles.detailNotesBadge}>
                        Review
                      </Badge>
                    )}
                  </View>
                  {hasDetailNotes ? (
                    <>
                      {selectedOrder.customerSpecialInstructions && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Customer Special Instructions</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Text style={styles.jobNotesText}>
                              {selectedOrder.customerSpecialInstructions}
                            </Text>
                          </CardContent>
                        </Card>
                      )}

                      {selectedOrder.siteAccessNotes && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Site Access Notes</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Text style={styles.jobNotesText}>
                              {selectedOrder.siteAccessNotes}
                            </Text>
                          </CardContent>
                        </Card>
                      )}

                      {selectedOrder.safetyWarnings &&
                        selectedOrder.safetyWarnings.length > 0 && (
                          <Card style={styles.jobNotesSafetyCard}>
                            <CardHeader>
                              <CardTitle>
                                <View style={styles.jobNotesSafetyTitleContainer}>
                                  <Icon
                                    name="warning"
                                    size={20}
                                    color={colors.destructive}
                                    style={styles.jobNotesSafetyIcon}
                                  />
                                  <Text style={[styles.cardTitleText, styles.jobNotesSafetyTitle]}>
                                    Safety Warnings
                                  </Text>
                                </View>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {selectedOrder.safetyWarnings.map((warning, index) => (
                                <View key={index} style={styles.safetyWarningItem}>
                                  <Text style={styles.safetyWarningText}>{warning}</Text>
                                </View>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                      {detailLastThreeNotes.length > 0 && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Previous Service Notes</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {detailLastThreeNotes.map((note, index) => (
                              <View key={index} style={styles.previousNoteItem}>
                                <View style={styles.previousNoteHeader}>
                                  <Text style={styles.previousNoteDate}>{note.date}</Text>
                                  {note.technician && (
                                    <Text style={styles.previousNoteTechnician}>
                                      {note.technician}
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.previousNoteText}>{note.note}</Text>
                              </View>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Text style={styles.detailNotesEmptyText}>
                      No service notes on file.
                    </Text>
                  )}
                </View>

                <View style={styles.detailActions}>
                  <Button
                    title={
                      isSelectedOrderCompleted
                        ? 'Order Completed'
                        : 'Start Service'
                    }
                    variant="primary"
                    size="lg"
                    disabled={isSelectedOrderCompleted}
                    onPress={() => {
                      if (!isSelectedOrderCompleted && selectedOrder) {
                        handleStartService(selectedOrder);
                      }
                    }}
                  />
                </View>
              </ScrollView>
            ) : (
              <View style={styles.detailPaneEmpty}>
                <Text style={styles.detailPaneEmptyTitle}>Select an Order</Text>
                <Text style={styles.detailPaneEmptyText}>
                  Choose an order from the list to view details and start
                  service.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Standard Full-Screen Dashboard Screen (original)
  const DashboardScreen = () => {
    // Use MOCK_ORDERS directly to ensure it's accessible
    const allOrders = MOCK_ORDERS || orders || [];
    // Split orders into active and completed
    const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
    const completedOrdersList = allOrders.filter(order => isOrderCompleted(order.orderNumber));
    const hasDashboardNotes = dashboardSelectedOrder
      ? hasOrderNotes(dashboardSelectedOrder)
      : false;
    const dashboardLastThreeNotes = dashboardSelectedOrder?.previousServiceNotes
      ? dashboardSelectedOrder.previousServiceNotes.slice(0, 3)
      : [];

    // Get offline limit warning message for header
    const getOfflineLimitMessage = () => {
      if (offlineStatus.isOnline) return null;

      const {warningLevel, offlineDurationMs} = offlineStatus;
      if (warningLevel === 'blocked') return null; // Modal handles this

      let messageText = '';
      let messageStyle = styles.offlineLimitMessage;
      let iconColor = colors.warning;

      if (warningLevel === 'critical') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
        if (remainingMinutes < 60) {
          messageText = `Critical: ${remainingMinutes} min remaining`;
        } else {
          const remainingHours = Math.floor(remainingMinutes / 60);
          const remainingMins = remainingMinutes % 60;
          messageText = `Critical: ${remainingHours} hr ${remainingMins} min remaining`;
        }
        messageStyle = styles.offlineLimitMessageCritical;
        iconColor = colors.destructive;
      } else if (warningLevel === 'orange') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        messageText = `Warning: ${remainingHours} hr ${remainingMins} min remaining`;
        messageStyle = styles.offlineLimitMessageOrange;
        iconColor = '#FF6B35';
      } else if (warningLevel === 'warning') {
        const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        messageText = `Warning: ${remainingHours} hr${remainingHours !== 1 ? 's' : ''} remaining`;
        messageStyle = styles.offlineLimitMessageWarning;
        iconColor = colors.warning;
      }

      if (!messageText) return null;

      return (
        <View style={messageStyle}>
          <Icon name="warning" size={14} color={iconColor} />
          <Text style={styles.offlineLimitMessageText}>{messageText}</Text>
        </View>
      );
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {serviceCenter && (
              <TouchableOpacity
                style={styles.serviceCenterBadge}
                onPress={() => setShowServiceCenterModal(true)}
                activeOpacity={0.7}>
                <Icon name="business" size={16} color={colors.primary} />
                <Text style={styles.serviceCenterText}>
                  {serviceCenterService.getDisplayFormat(false)}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerContent}
              onPress={() => onNavigate?.('Settings')}
              activeOpacity={0.7}>
              <Text style={styles.headerTitle}>
                {username ? `Welcome, ${username}` : 'Welcome'}
              </Text>
              {selectedTruck ? (
                <View>
                  <Text style={styles.headerSubtitle}>
                    Truck: {selectedTruck.number}
                  </Text>
                  {selectedTrailer && (
                    <Text style={styles.headerSubtitle}>
                      Trailer: {selectedTrailer.number}
                    </Text>
                  )}
                </View>
              ) : truckId ? (
                <Text style={styles.headerSubtitle}>Truck: {truckId}</Text>
              ) : (
                <Text style={styles.headerSubtitle}>Set Vehicle</Text>
              )}
          </TouchableOpacity>
            {getOfflineLimitMessage()}
          </View>
          <View style={styles.headerActions}>
            <View style={styles.headerSyncRow}>
              <View
                style={[
                  styles.syncStatus,
                  (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncStatusSynced,
                  syncStatus === 'syncing' && styles.syncStatusSyncing,
                  (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncStatusError,
                ]}>
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View
                    style={[
                      styles.syncDot,
                      (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncDotSynced,
                      (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncDotError,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.syncText,
                    (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncTextSynced,
                    (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncTextError,
                  ]}>
                  {syncStatus === 'syncing'
                    ? 'Syncing...'
                    : !offlineStatus.isOnline
                      ? 'Offline'
                      : syncStatus === 'error'
                        ? 'Connection failed'
                        : syncStatus === 'pending' && pendingSyncCount > 0
                          ? `Pending (${pendingSyncCount})`
                          : 'Synced'}
                </Text>
              </View>
              <Button
                title="Sync"
                variant="outline"
                size="sm"
                onPress={handleManualSync}
                disabled={syncStatus === 'syncing' || !offlineStatus.isOnline}
              />
            </View>
            {/* FR-3a.EXT.3.1: Drop button in header; opens Record Drop modal */}
            <Button
              title="Drop"
              variant="primary"
              size="md"
              onPress={() => setShowDropWasteModal(true)}
            />
            {isTablet() && isLandscape() && (
              <Button
                title="Master-Detail"
                variant="ghost"
                size="sm"
                onPress={() => {
                  const allOrders = MOCK_ORDERS || orders || [];
                  const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
                  // Auto-select first active order when switching to master-detail
                  if (activeOrders.length > 0 && !dashboardSelectedOrder) {
                    setDashboardSelectedOrder(activeOrders[0]);
                  }
                  setUseMasterDetail(true);
                }}
              />
            )}
            {onGoBack && (
              <Button
                title="Back"
                variant="ghost"
                size="sm"
                onPress={onGoBack}
              />
            )}
          </View>
        </View>

        <View style={styles.pageTitle}>
          <View style={styles.pageTitleRow}>
            <View style={styles.pageTitleContent}>
              <Text style={styles.pageTitleLogo}>Clean Earth Inc.</Text>
              <Text style={styles.pageTitleText}>Upcoming Orders</Text>
            </View>
            <Button
              title={
                upcomingOrdersWithNotes.length > 0
                  ? `View Notes (${upcomingOrdersWithNotes.length})`
                  : 'View Notes'
              }
              variant="outline"
              size="sm"
              onPress={() => setShowAllNotesModal(true)}
            />
          </View>
        </View>

        {/* FR-3a.EXT.3.3: Running total — current total weight and container count (active only); resets to 0 when all dropped */}
        <View style={styles.runningTotalRow}>
          <Text style={styles.runningTotalLabel}>Running total:</Text>
          <Text style={styles.runningTotalValue}>
            {activeContainerCount} container{activeContainerCount !== 1 ? 's' : ''} • {currentTotalWeight.toLocaleString()} lbs
          </Text>
        </View>

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              isTablet() && styles.scrollContentTablet,
            ]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={false}>
            
            {/* Show order details if an order is selected */}
            {dashboardSelectedOrder ? (
              <>
                <View style={styles.detailPaneHeader}>
                  <TouchableOpacity
                    onPress={() => setDashboardSelectedOrder(null)}
                    style={styles.backButton}
                    activeOpacity={0.7}>
                    <Icon name="arrow-back" size={20} color={colors.foreground} />
                    <Text style={styles.backButtonText}>Back to Orders</Text>
                  </TouchableOpacity>
                  <Text style={styles.detailPaneTitle}>
                    {dashboardSelectedOrder.orderNumber}
                  </Text>
                  <Badge
                    variant={
                      getOrderStatus(dashboardSelectedOrder) === 'Scheduled'
                        ? 'secondary'
                        : getOrderStatus(dashboardSelectedOrder) === 'Partial'
                          ? 'default'
                          : getOrderStatus(dashboardSelectedOrder) === 'In Progress'
                            ? 'default'
                            : 'destructive'
                    }>
                    {getOrderStatus(dashboardSelectedOrder)}
                  </Badge>
                </View>

                <Card style={styles.contactCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Primary Contact</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardSelectedOrder.primaryContactName ||
                    dashboardSelectedOrder.primaryContactPhone ||
                    dashboardSelectedOrder.primaryContactEmail ? (
                      <>
                        {dashboardSelectedOrder.primaryContactName && (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Name:</Text>
                            <Text style={styles.contactValue}>
                              {dashboardSelectedOrder.primaryContactName}
                            </Text>
                          </View>
                        )}
                        {dashboardSelectedOrder.primaryContactPhone ? (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Phone:</Text>
                            <TouchableOpacity
                              onPress={() =>
                                handlePhoneCall(dashboardSelectedOrder.primaryContactPhone!)
                              }
                              activeOpacity={0.7}>
                              <Text style={styles.contactLink}>
                                {formatPhoneNumber(dashboardSelectedOrder.primaryContactPhone)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Phone:</Text>
                            <Text style={styles.contactValue}>—</Text>
                          </View>
                        )}
                        {dashboardSelectedOrder.primaryContactEmail ? (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Email:</Text>
                            <TouchableOpacity
                              onPress={() =>
                                handleEmail(dashboardSelectedOrder.primaryContactEmail!)
                              }
                              activeOpacity={0.7}>
                              <Text style={styles.contactLink}>
                                {dashboardSelectedOrder.primaryContactEmail}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Email:</Text>
                            <Text style={styles.contactValue}>—</Text>
                          </View>
                        )}
                        {dashboardSelectedOrder.hasSecondaryContacts && (
                          <TouchableOpacity
                            style={styles.viewAllContactsButton}
                            onPress={() => {
                              Alert.alert(
                                'All Contacts',
                                'Secondary contacts feature coming soon.',
                              );
                            }}
                            activeOpacity={0.7}>
                            <Text style={styles.viewAllContactsText}>
                              View All Contacts
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View style={styles.noContactContainer}>
                        <Text style={styles.noContactText}>
                          No contact on file
                        </Text>
                      </View>
                    )}
                  </CardContent>
                </Card>

                <Card style={styles.detailCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Order Information</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <View style={styles.detailValueContainer}>
                        <Text style={styles.detailValue}>
                          {dashboardSelectedOrder.customer}
                        </Text>
                        {extractStoreNumber(dashboardSelectedOrder.site) && (
                          <Text style={styles.storeNumber}>
                            Store #{extractStoreNumber(dashboardSelectedOrder.site)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Site:</Text>
                      <Text style={styles.detailValue}>
                        {dashboardSelectedOrder.site}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>
                        {dashboardSelectedOrder.site}
                        {dashboardSelectedOrder.city && `, ${dashboardSelectedOrder.city}`}
                        {dashboardSelectedOrder.state && `, ${dashboardSelectedOrder.state}`}
                        {dashboardSelectedOrder.zip && ` ${dashboardSelectedOrder.zip}`}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expected Date:</Text>
                      <Text style={styles.detailValue}>
                        {dashboardSelectedOrder.serviceDate}
                      </Text>
                    </View>

                    {dashboardSelectedOrder.orderType && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Order Type:</Text>
                        <Text style={styles.detailValue}>
                          {dashboardSelectedOrder.orderType}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.programsDetailRow]}>
                      <Text style={styles.detailLabel}>Service Types:</Text>
                      <View style={styles.programsContainerInline}>
                        {dashboardSelectedOrder.programs.map((program, i) => {
                          const serviceOrderNumber = dashboardSelectedOrder.serviceOrderNumbers?.[program];
                          const noship = isServiceTypeNoShip(dashboardSelectedOrder.orderNumber, program);
                          const entry = serviceTypeTimeEntries.get(program);
                          const hasStart = entry?.startTime != null;
                          const hasEnd = entry?.endTime != null;
                          const inProgress = activeServiceTypeTimer === program || (hasStart && !hasEnd);
                          const completed = !noship && hasStart && hasEnd;
                          const pending = !noship && !hasStart;
                          const badgeStyle = [
                            styles.programBadge,
                            noship && styles.programBadgeNoship,
                            completed && styles.programBadgeCompleted,
                            inProgress && styles.programBadgeInProgress,
                            pending && styles.programBadgePending,
                          ].filter(Boolean) as ViewStyle[];
                          const textStyle = noship
                            ? styles.programBadgeTextNoship
                            : completed
                              ? styles.programBadgeTextCompleted
                              : inProgress
                                ? styles.programBadgeTextInProgress
                                : styles.programBadgeTextPending;
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              style={StyleSheet.flatten(badgeStyle)}
                              textStyle={textStyle}
                              title={serviceTypeService.getServiceTypeName(program)}>
                              {serviceOrderNumber
                                ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                                : serviceTypeService.formatForBadge(program)}
                            </Badge>
                          );
                        })}
                      </View>
                    </View>
                  </CardContent>
                </Card>

                <View style={styles.detailNotesSection}>
                  <View style={styles.detailNotesHeader}>
                    <Text style={styles.detailNotesTitle}>Service Notes</Text>
                    {hasDashboardNotes && (
                      <Badge variant="secondary" style={styles.detailNotesBadge}>
                        Review
                      </Badge>
                    )}
                  </View>
                  {hasDashboardNotes ? (
                    <>
                      {dashboardSelectedOrder.customerSpecialInstructions && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Customer Special Instructions</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Text style={styles.jobNotesText}>
                              {dashboardSelectedOrder.customerSpecialInstructions}
                            </Text>
                          </CardContent>
                        </Card>
                      )}

                      {dashboardSelectedOrder.siteAccessNotes && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Site Access Notes</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Text style={styles.jobNotesText}>
                              {dashboardSelectedOrder.siteAccessNotes}
                            </Text>
                          </CardContent>
                        </Card>
                      )}

                      {dashboardSelectedOrder.safetyWarnings &&
                        dashboardSelectedOrder.safetyWarnings.length > 0 && (
                          <Card style={styles.jobNotesSafetyCard}>
                            <CardHeader>
                              <CardTitle>
                                <View style={styles.jobNotesSafetyTitleContainer}>
                                  <Icon
                                    name="warning"
                                    size={20}
                                    color={colors.destructive}
                                    style={styles.jobNotesSafetyIcon}
                                  />
                                  <Text style={[styles.cardTitleText, styles.jobNotesSafetyTitle]}>
                                    Safety Warnings
                                  </Text>
                                </View>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {dashboardSelectedOrder.safetyWarnings.map((warning, index) => (
                                <View key={index} style={styles.safetyWarningItem}>
                                  <Text style={styles.safetyWarningText}>{warning}</Text>
                                </View>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                      {dashboardLastThreeNotes.length > 0 && (
                        <Card style={styles.jobNotesCard}>
                          <CardHeader>
                            <CardTitle>
                              <CardTitleText>Previous Service Notes</CardTitleText>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {dashboardLastThreeNotes.map((note, index) => (
                              <View key={index} style={styles.previousNoteItem}>
                                <View style={styles.previousNoteHeader}>
                                  <Text style={styles.previousNoteDate}>{note.date}</Text>
                                  {note.technician && (
                                    <Text style={styles.previousNoteTechnician}>
                                      {note.technician}
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.previousNoteText}>{note.note}</Text>
                              </View>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Text style={styles.detailNotesEmptyText}>
                      No service notes on file.
                    </Text>
                  )}
                </View>

                <View style={styles.detailActions}>
                  <Button
                    title={
                      isOrderCompleted(dashboardSelectedOrder.orderNumber)
                        ? 'Order Completed'
                        : 'Start Service'
                    }
                    variant="primary"
                    size="lg"
                    disabled={isOrderCompleted(dashboardSelectedOrder.orderNumber)}
                    onPress={() => {
                      if (!isOrderCompleted(dashboardSelectedOrder.orderNumber) && dashboardSelectedOrder) {
                        handleStartService(dashboardSelectedOrder);
                      }
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                {/* Active Orders Section */}
                <Text style={styles.ordersCount}>
                  {activeOrders.length} order
                  {activeOrders.length !== 1 ? 's' : ''} remaining
                </Text>

                {activeOrders.length > 0 ? (
                  activeOrders.map((order, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.orderCard,
                        isTablet() && styles.orderCardTablet,
                      ]}
                      onPress={() => {
                        setDashboardSelectedOrder(order);
                      }}
                      activeOpacity={0.7}>
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardHeaderLeft}>
                      <Text style={styles.orderNumber}>
                        {order.orderNumber}
                      </Text>
                     
                      {order.orderType && (
                        <Badge variant="outline">{order.orderType}</Badge>
                      )}
                    </View>
                    <Badge
                      variant={
                        getOrderStatus(order) === 'Scheduled'
                          ? 'secondary'
                          : getOrderStatus(order) === 'Partial'
                            ? 'default'
                            : getOrderStatus(order) === 'In Progress'
                              ? 'default'
                              : 'destructive'
                      }>
                      {getOrderStatus(order)}
                    </Badge>
                  </View>
                  <View style={styles.orderCardBody}>
                    <Text style={styles.customerName}>
                      {formatCustomerWithStore(order.customer, order.site)}
                    </Text>
                    <Text style={styles.siteInfo}>
                      {order.site}
                      {order.city && `, ${order.city}`}
                      {order.state && `, ${order.state}`}
                      {order.zip && ` ${order.zip}`}
                    </Text>
                    <Text style={styles.serviceDate}>{order.serviceDate}</Text>
                    <View style={styles.programsContainer}>
                      {order.programs.map((program, i) => {
                        const serviceType = serviceTypeService.getServiceType(program);
                        const serviceOrderNumber = order.serviceOrderNumbers?.[program];
                        const noship = isServiceTypeNoShip(order.orderNumber, program);
                        const entry = serviceTypeTimeEntries.get(program);
                        const hasStart = entry?.startTime != null;
                        const hasEnd = entry?.endTime != null;
                        const inProgress =
                          selectedOrderData?.orderNumber === order.orderNumber &&
                          (currentOrderTimeTracking?.orderNumber === order.orderNumber &&
                            (activeServiceTypeTimer === program || (hasStart && !hasEnd)));
                        const completed = !noship && hasStart && hasEnd;
                        const pending = !noship && !hasStart;
                        const badgeStyle = [
                          styles.programBadge,
                          noship && styles.programBadgeNoship,
                          completed && styles.programBadgeCompleted,
                          inProgress && styles.programBadgeInProgress,
                          pending && styles.programBadgePending,
                        ].filter(Boolean) as ViewStyle[];
                        const textStyle = noship
                          ? styles.programBadgeTextNoship
                          : completed
                            ? styles.programBadgeTextCompleted
                            : inProgress
                              ? styles.programBadgeTextInProgress
                              : styles.programBadgeTextPending;
                        return (
                          <Badge
                            key={i}
                            variant="outline"
                            style={StyleSheet.flatten(badgeStyle)}
                            textStyle={textStyle}
                            title={serviceType?.name || program}>
                            {serviceOrderNumber
                              ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                              : serviceTypeService.formatForBadge(program)}
                          </Badge>
                        );
                      })}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>All Orders Complete!</Text>
                    <Text style={styles.emptyStateText}>
                      You have completed all orders for today.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Completed Orders Section */}
            {completedOrdersList.length > 0 && (
              <View style={styles.completedOrdersSection}>
                <View style={styles.completedOrdersHeader}>
                  <View style={styles.completedOrdersTitleRow}>
                    <Icon name="check-circle" size={20} color={colors.success} style={styles.completedOrdersIcon} />
                    <Text style={styles.completedOrdersTitle}>
                      Completed ({completedOrdersList.length})
                    </Text>
                  </View>
                </View>
                {completedOrdersList.map((order, index) => (
                  <View
                    key={index}
                    style={styles.completedOrderCard}>
                    <View style={styles.completedOrderContent}>
                      <View style={styles.completedOrderLeft}>
                        <Text style={styles.completedOrderNumber}>
                          {order.orderNumber}
                        </Text>
                        <Text style={styles.completedOrderCustomer}>
                          {formatCustomerWithStore(order.customer, order.site)}
                        </Text>
                      </View>
                      <View style={styles.completedOrderRight}>
                        <Icon name="check-circle" size={24} color={colors.success} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  // Ref to maintain focus on search input
  const searchInputRef = useRef<TextInput>(null);
  const isInputFocusedRef = useRef(false);

  // Track focus state
  const handleSearchFocus = useCallback(() => {
    isInputFocusedRef.current = true;
  }, []);

  const handleSearchBlur = useCallback(() => {
    isInputFocusedRef.current = false;
  }, []);

  // Stable onChange handler that maintains focus
  const handleSearchChange = useCallback((text: string) => {
    const wasFocused = isInputFocusedRef.current;
    setStreamSearchQuery(text);
    // Restore focus after state update if it was focused
    if (wasFocused && searchInputRef.current) {
      // Use setTimeout to ensure focus happens after render cycle
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, []);

  // Persistent Order Header Component

  // StreamSelectionScreen component - defined as a stable component
  const StreamSelectionScreen = () => {
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    if (!selectedOrderData) return null;
    
      // Get warning banner based on offline status
      const getWarningBanner = () => {
        if (offlineStatus.isOnline) return null;

        const {warningLevel, offlineDurationMs} = offlineStatus;
        if (warningLevel === 'blocked') return null; // Modal handles this

        let bannerStyle = styles.offlineWarningBanner;
        let bannerText = '';
        let remainingTime = '';
        let iconColor = colors.foreground;

        if (warningLevel === 'critical') {
          // Red critical banner at 9.5 hours
          bannerStyle = styles.offlineCriticalBanner;
          iconColor = colors.primaryForeground;
          const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
          const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
          if (remainingMinutes < 60) {
            remainingTime = `${remainingMinutes} min remaining`;
          } else {
            const remainingHours = Math.floor(remainingMinutes / 60);
            const remainingMins = remainingMinutes % 60;
            remainingTime = `${remainingHours} hr ${remainingMins} min remaining`;
          }
          bannerText = `Critical: ${remainingTime} before offline limit`;
        } else if (warningLevel === 'orange') {
          // Orange warning banner at 9 hours
          bannerStyle = styles.offlineOrangeBanner;
          iconColor = '#FF6B35';
          const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
          const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
          const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          remainingTime = `${remainingHours} hr ${remainingMins} min remaining`;
          bannerText = `Warning: ${remainingTime} before offline limit`;
        } else if (warningLevel === 'warning') {
          // Yellow warning banner at 8 hours
          bannerStyle = styles.offlineWarningBanner;
          iconColor = colors.foreground;
          const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
          const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
          remainingTime = `${remainingHours} hr${remainingHours !== 1 ? 's' : ''} remaining`;
          bannerText = `Warning: ${remainingTime} before offline limit`;
        }

        if (!bannerText) return null;

        return (
          <View style={bannerStyle}>
            <View style={styles.offlineWarningBannerRow}>
              <Icon 
                name="warning" 
                size={18} 
                color={iconColor} 
              />
              <Text style={styles.offlineWarningBannerText}>{bannerText}</Text>
            </View>
          </View>
        );
      };

      return (
        <View style={styles.container}>
          {getWarningBanner()}
          <PersistentOrderHeader
            orderData={selectedOrderData}
            isCollapsed={isOrderHeaderCollapsed}
            onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
            onBackPress={() => setCurrentStep('dashboard')}
          subtitle={`${selectedOrderData.customer || 'Customer Name'} - ${selectedOrderData.site || 'Site Location'}`}
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}>
          <Input
            ref={searchInputRef}
            placeholder="Search waste streams..."
            value={streamSearchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            containerStyle={styles.searchInput}
          />

          {filteredStreams.length > 0 ? (
            <View style={styles.streamsGrid} key="streams-grid">
              {filteredStreams.map(stream => {
                const handleStreamPress = () => {
                  if (!isCurrentOrderCompleted && stream) {
                    // Check if blocked due to offline limit
                    if (offlineStatus.isBlocked) {
                      setShowOfflineBlockedModal(true);
                      return;
                    }

                    // No P-Listed check here - moved to "Continue to Manifest"
                    // Track recently used profile
                    setRecentlyUsedProfiles(prev => {
                      // Remove if already exists, then add to front
                      const filtered = prev.filter(id => id !== stream.id);
                      return [stream.id, ...filtered].slice(0, 5); // Keep only last 5
                    });
                    
                    setSelectedStream(stream.profileName);
                    setSelectedStreamCode(stream.profileNumber);
                    setSelectedStreamId(stream.id);
                    setCylinderCount(''); // Reset cylinder count when stream changes
                    setCurrentStep('container-selection');
                  }
                };

                // Get category badge variant and style
                // Only 4 valid categories: Hazardous (red), Non-Haz (green), Universal (yellow), DEA (blue)
                const getCategoryBadgeConfig = (category: string) => {
                  const categoryLower = category.toLowerCase().trim();
                  // Check Non-Haz first to avoid any potential matching issues
                  if (categoryLower === 'non-haz') {
                    return {
                      variant: 'outline' as const,
                      style: styles.categoryBadgeGreen,
                      textStyle: styles.categoryBadgeTextWhite,
                    };
                  } else if (categoryLower === 'hazardous') {
                    return {
                      variant: 'outline' as const,
                      style: styles.categoryBadgeRed,
                      textStyle: styles.categoryBadgeTextWhite,
                    };
                  } else if (categoryLower === 'universal') {
                    return {
                      variant: 'outline' as const,
                      style: styles.categoryBadgeYellow,
                      textStyle: styles.categoryBadgeTextWhite,
                    };
                  } else if (categoryLower === 'dea') {
                    return {
                      variant: 'outline' as const,
                      style: styles.categoryBadgeBlue,
                      textStyle: styles.categoryBadgeTextWhite,
                    };
                  }
                  // Default fallback (should not happen with valid categories)
                  return {
                    variant: 'secondary' as const,
                    style: undefined,
                    textStyle: undefined,
                  };
                };

                const categoryBadgeConfig = getCategoryBadgeConfig(stream.category);

                return (
                  <TouchableOpacity
                    key={stream.id}
                    style={styles.streamCard}
                    onPress={handleStreamPress}
                    disabled={isCurrentOrderCompleted}
                    activeOpacity={isCurrentOrderCompleted ? 1 : 0.7}>
                  <View style={styles.streamCardHeader}>
                    {recentlyUsedProfiles.includes(stream.id) && (
                      <Badge 
                        variant="outline" 
                        style={styles.recentlyUsedBadge}
                        textStyle={styles.recentlyUsedBadgeText}>
                        Recently Used
                      </Badge>
                    )}
                  </View>
                  <Text style={styles.streamCardTitle}>
                    {stream.profileName}
                  </Text>
                  <Badge
                    variant={categoryBadgeConfig.variant}
                    style={categoryBadgeConfig.style}
                    textStyle={categoryBadgeConfig.textStyle}>
                    {stream.category}
                  </Badge>
                </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Waste Streams Found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your search terms
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const ContainerSelectionScreen = () => {
    const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
    const allowedContainerIds = currentStream?.allowedContainers || [];
    const filteredContainers = allContainerTypes.filter(c =>
      allowedContainerIds.includes(c.id),
    );
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    if (!selectedOrderData) return null;
    
    return (
      <View style={styles.container}>
        <PersistentOrderHeader
          orderData={selectedOrderData}
          isCollapsed={isOrderHeaderCollapsed}
          onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
          onBackPress={() => setCurrentStep('stream-selection')}
          subtitle={selectedStream}
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}>
          {filteredContainers.length > 0 ? (
            <View style={styles.containersGrid}>
              {filteredContainers.map((container, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.containerCard}
                  onPress={() => {
                    if (!isCurrentOrderCompleted) {
                      setSelectedContainerType(container);
                      setCurrentStep('container-entry');
                    }
                  }}
                  disabled={isCurrentOrderCompleted}
                  activeOpacity={isCurrentOrderCompleted ? 1 : 0.7}>
                  {container.popular && (
                    <Badge variant="default" style={styles.popularBadge}>
                      Popular
                    </Badge>
                  )}
                  <Text style={styles.containerCardCode}>{container.code}</Text>
                  <Text style={styles.containerCardTitle}>
                    {container.size}
                  </Text>
                  <Text style={styles.containerCardInfo}>
                    {container.capacity}
                  </Text>
                  <Text style={styles.containerCardInfo}>
                    {container.weight}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                No Containers Available
              </Text>
              <Text style={styles.emptyStateText}>
                No container types are configured for this waste stream profile.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const ContainerEntryScreen = () => {
    const netWeight =
      parseInt(grossWeight || '0') - parseInt(tareWeight || '0');
    
    // Check if current stream requires cylinder count
    const currentStream = wasteStreams.find(s => s.id === selectedStreamId);
    const requiresCylinderCount = currentStream?.requiresCylinderCount || false;

    // Get weight limits from selected container type
    const getWeightLimits = () => {
      if (!selectedContainerType) {
        return {
          max: 400,
          softThreshold: 240,
          hardThreshold: 400,
        };
      }

      // Parse weight string like "400 lbs max" to get the number
      const weightMatch = selectedContainerType.weight.match(/(\d+)/);
      const maxWeight = weightMatch ? parseInt(weightMatch[1]) : 400;

      // Soft warning at 60% of max, hard warning at 100% of max
      return {
        max: maxWeight,
        softThreshold: Math.floor(maxWeight * 0.6),
        hardThreshold: maxWeight,
      };
    };

    const weightLimits = getWeightLimits();
    const showSoftWarning =
      netWeight >= weightLimits.softThreshold &&
      netWeight < weightLimits.hardThreshold;
    const showHardWarning = netWeight >= weightLimits.hardThreshold;

    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    // Capture scale reading once when scale connects
    useEffect(() => {
      if (isScaleConnected) {
        // Simulate capturing a single scale reading when connected
        const capturedWeight = 285; // Simulated captured weight from scale
        setScaleReading(capturedWeight);
        setScaleWeight(capturedWeight.toString());
      } else {
        setScaleReading(null);
        setScaleWeight('');
      }
    }, [isScaleConnected]);

    // When scale weight changes, update gross weight
    useEffect(() => {
      if (scaleWeight && !isNaN(parseFloat(scaleWeight))) {
        setGrossWeight(scaleWeight);
        setIsManualWeightEntry(false);
      }
    }, [scaleWeight]);

    // Handle manual weight entry
    const handleManualWeightChange = (
      field: 'tare' | 'gross',
      value: string,
    ) => {
      if (field === 'tare') {
        setTareWeight(value);
      } else {
        setGrossWeight(value);
      }
      setIsManualWeightEntry(true);
    };

    if (!selectedOrderData) return null;
    
    return (
      <View style={styles.container}>
        <PersistentOrderHeader
          orderData={selectedOrderData}
          isCollapsed={isOrderHeaderCollapsed}
          onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
          onBackPress={() => setCurrentStep('container-selection')}
          subtitle={`${selectedStream} • ${selectedContainerType?.size || 'Container'}`}
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={false}
          scrollEventThrottle={16}>
          
          {/* Cylinder Count Input - Only shown for profiles that require it */}
          {requiresCylinderCount && (
            <Card style={styles.cylinderCountCard}>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Cylinder Count</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  label="Number of Cylinders *"
                  value={cylinderCount}
                  onChangeText={setCylinderCount}
                  keyboardType="numeric"
                  placeholder="Enter cylinder count"
                  editable={!isCurrentOrderCompleted}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Weight Information</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Net Weight Display - Most Prominent */}
              <View
                style={[
                  styles.netWeightDisplayCard,
                  showHardWarning && styles.netWeightDisplayCardHardWarning,
                  showSoftWarning && styles.netWeightDisplayCardSoftWarning,
                ]}>
                <Text style={styles.netWeightDisplayLabel}>
                  Net Weight (Waste Only)
                </Text>
                <View style={styles.netWeightDisplayValue}>
                  <Text
                    style={[
                      styles.netWeightDisplayLargeValue,
                      showHardWarning &&
                        styles.netWeightDisplayLargeValueWarning,
                    ]}>
                    {netWeight}
                  </Text>
                  <Text style={styles.netWeightDisplayUnit}>lbs</Text>
                </View>
                {showSoftWarning && (
                  <View style={styles.inlineWarningSoft}>
                    <View style={styles.inlineWarningRow}>
                      <Icon name="warning" size={18} color={colors.warning} style={styles.inlineWarningIcon} />
                      <Text style={styles.inlineWarningText}>
                        Approaching capacity (
                        {Math.round((netWeight / weightLimits.max) * 100)}% of{' '}
                        {weightLimits.max} lbs)
                      </Text>
                    </View>
                  </View>
                )}
                {showHardWarning && (
                  <View style={styles.inlineWarningHard}>
                    <View style={styles.inlineWarningRow}>
                      <Icon name="warning" size={18} color={colors.destructive} style={styles.inlineWarningIcon} />
                      <Text style={styles.inlineWarningText}>
                        EXCEEDS MAXIMUM ({netWeight} lbs / {weightLimits.max}{' '}
                        lbs max) - Must consolidate or use new container
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Compact Weight Info Row */}
              <View style={styles.compactWeightRow}>
                <View style={styles.compactWeightItem}>
                  <Text style={styles.compactWeightLabel}>Tare Weight</Text>
                  <Text style={styles.compactWeightValue}>{tareWeight}</Text>
                  <Text style={styles.compactWeightUnit}>lbs</Text>
                </View>
                <View style={styles.compactWeightDivider} />
                <View style={styles.compactWeightItem}>
                  <View style={styles.compactScaleHeader}>
                    <Text style={styles.compactWeightLabel}>Scale Weight</Text>
                    <View style={styles.compactScaleStatus}>
                      <View
                        style={[
                          styles.compactScaleLight,
                          isScaleConnected
                            ? styles.compactScaleLightOnline
                            : styles.compactScaleLightOffline,
                        ]}
                      />
                    </View>
                  </View>
                  {isScaleConnected && scaleReading !== null ? (
                    <Text style={styles.compactWeightValue}>
                      {scaleReading}
                    </Text>
                  ) : (
                    <Text style={styles.compactWeightValueOffline}>---</Text>
                  )}
                  <Input
                    value={scaleWeight}
                    onChangeText={setScaleWeight}
                    keyboardType="numeric"
                    editable={!isCurrentOrderCompleted}
                    style={styles.compactScaleInput}
                    containerStyle={styles.compactScaleInputContainer}
                  />
                  <Text style={styles.compactWeightUnit}>lbs (Gross)</Text>
                </View>
                <View style={styles.compactWeightDivider} />
                <View style={styles.compactWeightItem}>
                  <Text style={styles.compactWeightLabel}>Net Weight</Text>
                  <Text
                    style={[
                      styles.compactWeightValue,
                      styles.compactWeightValueNet,
                    ]}>
                    {netWeight}
                  </Text>
                  <Text style={styles.compactWeightUnit}>lbs (Waste)</Text>
                </View>
              </View>

              {/* Manual Entry Indicator */}
              {isManualWeightEntry && (
                <View style={styles.manualEntryIndicator}>
                  <View style={styles.manualWeightRow}>
                    <Icon name="warning" size={16} color={colors.warning} style={styles.manualWeightIcon} />
                    <Text style={styles.manualEntryText}>Weight entered manually</Text>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            onPress={() => {
              setIsManualWeightEntry(false);
              setCurrentStep('container-selection');
            }}
          />
          <Button
            title="Add Container"
            variant="primary"
            size="md"
            disabled={isCurrentOrderCompleted || offlineStatus.isBlocked}
            onPress={async () => {
              if (
                selectedContainerType &&
                selectedStream &&
                !isCurrentOrderCompleted
              ) {
                // Check if blocked due to offline limit
                if (offlineStatus.isBlocked) {
                  setShowOfflineBlockedModal(true);
                  return;
                }

                // Validate cylinder count if required
                if (requiresCylinderCount && (!cylinderCount || cylinderCount.trim() === '')) {
                  Alert.alert(
                    'Required Field',
                    'Please enter the cylinder count before adding the container.'
                  );
                  return;
                }

                // Check if blocked due to offline limit
                if (offlineStatus.isBlocked) {
                  setShowOfflineBlockedModal(true);
                  return;
                }

                const netWeight =
                  parseInt(grossWeight || '0') - parseInt(tareWeight || '0');

                // Get current container count for this order to generate sequential barcode
                const currentContainerCount = addedContainers.length;
                const orderNumber =
                  selectedOrderData?.orderNumber || 'WO-2024-0000';
                const shippingLabelBarcode = generateShippingLabelBarcode(
                  orderNumber,
                  currentContainerCount,
                );

                const newContainer = {
                  id: `container-${Date.now()}`,
                  streamName: selectedStream,
                  streamCode: selectedStreamCode,
                  containerType: selectedContainerType.code,
                  containerSize: selectedContainerType.size,
                  barcode: barcode || `AUTO-${Date.now()}`,
                  tareWeight,
                  grossWeight,
                  netWeight,
                  isManualEntry: isManualWeightEntry, // Track if manually entered
                  shippingLabelBarcode, // Unique shipping label barcode
                  status: 'loaded' as const, // FR-3a.EXT.3.2: active on truck until dropped
                  ...(requiresCylinderCount && cylinderCount ? { cylinderCount: parseInt(cylinderCount) || 0 } : {}),
                };

                setAddedContainers(prev => [...prev, newContainer]);

                // Queue for sync
                await syncService.addPendingOperation(
                  'container',
                  newContainer,
                );

                // Show label printing notification
                setPrintingLabelBarcode(shippingLabelBarcode);
                setShowLabelPrinting(true);

                // Auto-print shipping label
                await printShippingLabel(newContainer);

                // Hide notification after 3 seconds
                setTimeout(() => {
                  setShowLabelPrinting(false);
                  setPrintingLabelBarcode('');
                }, 3000);

                // Reset form
                setBarcode('');
                setTareWeight('45');
                setGrossWeight('285');
                setCylinderCount('');
                setIsManualWeightEntry(false);
                setCurrentStep('container-summary');
              }
            }}
          />
        </View>
      </View>
    );
  };

  const ContainerSummaryScreen = () => {
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
      visible: boolean;
      containerId: string | null;
      containerIndex: number | null;
    }>({
      visible: false,
      containerId: null,
      containerIndex: null,
    });

    const handleDeleteContainer = (
      containerId: string,
      containerIndex: number,
    ) => {
      // Show custom confirmation modal
      setDeleteConfirmation({
        visible: true,
        containerId,
        containerIndex,
      });
    };

    const handleConfirmDelete = () => {
      if (deleteConfirmation.containerId) {
        // Remove container from state
        setAddedContainers(prev =>
          prev.filter(
            container => container.id !== deleteConfirmation.containerId,
          ),
        );
      }
      // Close modal
      setDeleteConfirmation({
        visible: false,
        containerId: null,
        containerIndex: null,
      });
    };

    const handleCancelDelete = () => {
      // Close modal
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
          onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
          onBackPress={() => setCurrentStep('container-entry')}
          subtitle="Container Summary"
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Text style={styles.summaryText}>
              Showing {activeContainerCount} container
              {activeContainerCount !== 1 ? 's' : ''} on truck
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
                            Waste Code(s)
                          </Text>
                          <Text style={styles.containerSummaryInfoValue}>
                            {container.streamCode}
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
                      {!isCurrentOrderCompleted && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteContainer(container.id, index)}
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
            disabled={isCurrentOrderCompleted}
            onPress={() => {
              if (!isCurrentOrderCompleted) {
                setCurrentStep('stream-selection');
              }
            }}
          />
          <Button
            title="Continue to Manifest"
            variant="primary"
            size="md"
            disabled={activeContainerCount === 0 || isCurrentOrderCompleted}
            onPress={() => {
              if (!isCurrentOrderCompleted) {
                // Check for P-Listed waste codes in all added containers
                const allPCodes: PListedCode[] = [];
                const streamsWithPCodes: WasteStream[] = [];
                
                // Collect all P-Listed codes from all active added containers
                activeContainers.forEach(container => {
                  // Find the stream that matches this container
                  const stream = wasteStreams.find(
                    s => s.profileName === container.streamName || s.profileNumber === container.streamCode
                  );
                  if (stream) {
                    const pCodes = pListedAuthorizationService.extractPListedCodes(stream);
                    if (pCodes.length > 0) {
                      allPCodes.push(...pCodes);
                      if (!streamsWithPCodes.find(s => s.id === stream.id)) {
                        streamsWithPCodes.push(stream);
                      }
                    }
                  }
                });
                
                // If P-Listed codes found, validate authorization
                if (allPCodes.length > 0 && selectedOrderData && username) {
                  // Get generator ID from order
                  const generatorId = String(
                    selectedOrderData.genNumber || selectedOrderData.customer || ''
                  );
                  
                  // Validate authorization for all P-Listed codes
                  const authResult = pListedAuthorizationService.validateAuthorization(
                    username,
                    generatorId,
                    allPCodes,
                  );
                  
                  // Store auth result
                  setPListedAuthResult({
                    ...authResult,
                    pCodes: allPCodes,
                  });
                  setPListedAuthAcknowledged(false);
                  setPListedAuthCode('');
                  setPListedAuthCodeValid(false);
                  setShowPListedAuthModal(true);
                  return; // Don't proceed to manifest until authorized
                }
                
                // No P-Listed codes or authorization passed - proceed to manifest
                setCurrentStep('manifest-management');
              }
            }}
          />
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

  const ManifestManagementScreen = () => {
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    if (!selectedOrderData) return null;

    return (
      <View style={styles.container}>
        <PersistentOrderHeader
          orderData={selectedOrderData}
          isCollapsed={isOrderHeaderCollapsed}
          onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
          onBackPress={() => setCurrentStep('container-summary')}
          subtitle="Manifest Management"
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Card style={styles.manifestShipmentCard}>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Manifest Shipment</CardTitleText>
                </CardTitle>
                <Text style={styles.manifestShipmentSubtitle}>
                  Review and sign your shipment manifest, then continue when ready.
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.manifestSummarySection}>
                  <View style={styles.manifestSummaryRow}>
                    <View style={styles.manifestSummaryItem}>
                      <Text style={styles.manifestSummaryLabel}>
                        Total Containers
                      </Text>
                      <Text style={styles.manifestSummaryValue}>
                        {addedContainers.length}
                      </Text>
                    </View>
                    {manifestTrackingNumber ? (
                      <>
                        <View style={styles.manifestSummaryDivider} />
                        <View style={styles.manifestSummaryItem}>
                          <Text style={styles.manifestSummaryLabel}>
                            Tracking Number
                          </Text>
                          <Text
                            style={[
                              styles.manifestSummaryValue,
                              styles.trackingNumber,
                            ]}>
                            {manifestTrackingNumber}
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>

                {manifestData?.scannedImageUri ? (
                  <View style={styles.scannedImageIndicator}>
                    <View style={styles.manifestSuccessRow}>
                      <Icon name="check-circle" size={18} color={colors.success} style={styles.manifestSuccessIcon} />
                      <Text style={styles.scannedImageText}>
                        Manifest document scanned and uploaded
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.manifestActionsInCard}>
                  <Text style={styles.manifestActionsLabel}>Manifest actions</Text>
                  <View style={styles.manifestActionsRow}>
                    <Button
                      title="Sign Manifest"
                      variant="outline"
                      size="md"
                      disabled={isCurrentOrderCompleted}
                      onPress={() => setShowSignatureModal(true)}
                      style={styles.manifestActionButton}
                    />
                    <Button
                      title="Print Preview"
                      variant="outline"
                      size="md"
                      disabled={isCurrentOrderCompleted}
                      onPress={() => setShowPrintPreview(true)}
                      style={styles.manifestActionButton}
                    />
                    <Button
                      title="Print Options"
                      variant="outline"
                      size="md"
                      disabled={isCurrentOrderCompleted}
                      onPress={() => setShowPrintOptions(true)}
                      style={styles.manifestActionButton}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <Button
            title="Back"
            variant="outline"
            size="md"
            onPress={() => setCurrentStep('container-summary')}
          />
          <Button
            title="Continue"
            variant="primary"
            size="md"
            disabled={isCurrentOrderCompleted}
            onPress={() => {
              if (!isCurrentOrderCompleted) {
                // Skip materials-supplies and equipment - accessible from quick actions
                // Go directly to order completion/service summary
                setCurrentStep('order-service');
              }
            }}
          />
        </View>

        {/* Signature Modal */}
        <Modal
          visible={showSignatureModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowSignatureModal(false)}>
          <SafeAreaView style={styles.signatureModalContainer}>
            <View style={styles.signatureModalHeader}>
              <Text style={styles.signatureModalTitle}>Sign Manifest</Text>
              <TouchableOpacity
                onPress={() => setShowSignatureModal(false)}
                style={styles.signatureModalCloseBtn}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.signatureCanvasContainer}>
              <Text style={styles.signatureModalTitle}>Signature Area</Text>
              <View style={{
                flex: 1,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <SignatureCanvas
                  ref={signatureRef}
                  onOK={(signature: string) => {
                    setManifestData(prev => ({
                      ...prev,
                      signatureImageUri: signature,
                    }));
                    setShowSignatureModal(false);
                  }}
                  onEmpty={() => {
                    Alert.alert('Please Sign', 'Please provide a signature before saving.');
                  }}
                  penColor="#000000"
                  strokeWidth={3}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Button
                  title="Clear"
                  onPress={() => signatureRef.current?.clearSignature()}
                  variant="outline"
                />
                <Button
                  title="Cancel"
                  onPress={() => setShowSignatureModal(false)}
                  variant="outline"
                />
                <Button
                  title="Save"
                  onPress={() => signatureRef.current?.readSignature()}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Print Preview Modal - EPA Uniform Hazardous Waste Manifest */}
        <Modal
          visible={showPrintPreview}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowPrintPreview(false)}>
          <SafeAreaView style={styles.manifestPreviewContainer}>
            {/* Header Bar */}
            <View style={styles.manifestPreviewHeader}>
              <Text style={styles.manifestPreviewHeaderTitle}>
                Manifest Print Preview
              </Text>
              <TouchableOpacity
                onPress={() => setShowPrintPreview(false)}
                style={styles.manifestPreviewCloseBtn}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.manifestPreviewScroll}>
              {/* EPA Form Container */}
              <View style={styles.epaFormContainer}>
                {/* Form Header */}
                <View style={styles.epaFormHeader}>
                  <View style={styles.epaFormHeaderLeft}>
                    <Text style={styles.epaFormSmallText}>Please print or type.</Text>
                    <View style={styles.epaFormTitleBox}>
                      <Text style={styles.epaFormTitle}>UNIFORM HAZARDOUS</Text>
                      <Text style={styles.epaFormTitle}>WASTE MANIFEST</Text>
                    </View>
                  </View>
                  <View style={styles.epaFormHeaderCenter}>
                    <View style={styles.epaFormBarcodeBox}>
                      <Text style={styles.epaFormBarcodeText}>201286074XXX</Text>
                      <Text style={styles.epaFormManifestNum}>43343836</Text>
                    </View>
                    <Text style={styles.epaFormProviderText}>ERI Provider: Clean Earth</Text>
                  </View>
                  <View style={styles.epaFormHeaderRight}>
                    <View style={styles.epaFormPageBox}>
                      <Text style={styles.epaFormPageNum}>1</Text>
                    </View>
                    <Text style={styles.epaFormSmallText}>Form Approved, OMB No. 2050-0039</Text>
                  </View>
                </View>

                {/* Section 1-4: Generator ID, Page, Emergency Phone, Manifest Tracking */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>1. Generator ID Number</Text>
                    <Text style={styles.epaFormCellValue}>CAL000483809</Text>
                  </View>
                  <View style={[styles.epaFormCell, {width: 60}]}>
                    <Text style={styles.epaFormCellLabel}>2. Page 1 of</Text>
                    <Text style={styles.epaFormCellValue}>1</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>3. Emergency Response Phone</Text>
                    <Text style={styles.epaFormCellValue}>(877) 577-2669</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1.5}]}>
                    <Text style={styles.epaFormCellLabel}>4. Manifest Tracking Number</Text>
                    <Text style={styles.epaFormCellValueLarge}>201286074XXX</Text>
                  </View>
                </View>

                {/* Section 5: Generator Info */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>5. Generator's Name and Mailing Address</Text>
                    <Text style={styles.epaFormCellValue}>Attn: William Quila</Text>
                    <Text style={styles.epaFormCellValueBold}>Soleo Health</Text>
                    <Text style={styles.epaFormCellValue}>1324 W Winton Ave</Text>
                    <Text style={styles.epaFormCellValue}>Hayward, CA 94545-1408 Ph: (510) 362-7360</Text>
                    <Text style={styles.epaFormCellLabelSmall}>Generator's Phone:</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>Generator's Site Address (if different than mailing address)</Text>
                    <Text style={styles.epaFormCellValueBold}>Soleo Health</Text>
                    <Text style={styles.epaFormCellValue}>1324 W Winton Ave</Text>
                    <Text style={styles.epaFormCellValue}>Hayward, CA 94545-1408 Ph: (510) 362-7360</Text>
                  </View>
                </View>

                {/* Section 6: Transporter 1 */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 2}]}>
                    <Text style={styles.epaFormCellLabel}>6. Transporter 1 Company Name</Text>
                    <Text style={styles.epaFormCellValueBold}>Clean Earth Specialty Waste Solutions, Inc.</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                    <Text style={styles.epaFormCellValue}>MNS000110924</Text>
                  </View>
                </View>

                {/* Section 7: Transporter 2 */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 2}]}>
                    <Text style={styles.epaFormCellLabel}>7. Transporter 2 Company Name</Text>
                    <Text style={styles.epaFormCellValue}></Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                    <Text style={styles.epaFormCellValue}></Text>
                  </View>
                </View>

                {/* Section 8: Designated Facility */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 2}]}>
                    <Text style={styles.epaFormCellLabel}>8. Designated Facility Name and Site Address</Text>
                    <Text style={styles.epaFormCellValueBold}>Clean Earth of Alabama, Inc.</Text>
                    <Text style={styles.epaFormCellValue}>402 Webster Chapel Road</Text>
                    <Text style={styles.epaFormCellValue}>Glencoe, AL 35905</Text>
                    <Text style={styles.epaFormCellLabelSmall}>Facility's Phone: 8007399156</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                    <Text style={styles.epaFormCellValueBold}>ALD981020894</Text>
                  </View>
                </View>

                {/* Section 9: Waste Description Table Header */}
                <View style={styles.epaFormSectionHeader}>
                  <Text style={styles.epaFormSectionHeaderText}>GENERATOR</Text>
                </View>
                <View style={styles.epaWasteTableHeader}>
                  <View style={[styles.epaWasteTableCell, {width: 30}]}>
                    <Text style={styles.epaFormCellLabelSmall}>9a.</Text>
                    <Text style={styles.epaFormCellLabelSmall}>HM</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {flex: 3}]}>
                    <Text style={styles.epaFormCellLabelSmall}>9b. U.S. DOT Description (including Proper Shipping Name, Hazard Class, ID Number,</Text>
                    <Text style={styles.epaFormCellLabelSmall}>and Packing Group (if any))</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 80}]}>
                    <Text style={styles.epaFormCellLabelSmall}>10. Containers</Text>
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.epaFormCellLabelSmall, {flex: 1}]}>No.</Text>
                      <Text style={[styles.epaFormCellLabelSmall, {flex: 1}]}>Type</Text>
                    </View>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 60}]}>
                    <Text style={styles.epaFormCellLabelSmall}>11. Total</Text>
                    <Text style={styles.epaFormCellLabelSmall}>Quantity</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 40}]}>
                    <Text style={styles.epaFormCellLabelSmall}>12. Unit</Text>
                    <Text style={styles.epaFormCellLabelSmall}>Wt/Vol</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 100}]}>
                    <Text style={styles.epaFormCellLabelSmall}>13. Waste Codes</Text>
                  </View>
                </View>

                {/* Waste Row 1 */}
                <View style={styles.epaWasteTableRow}>
                  <View style={[styles.epaWasteTableCell, {width: 30, justifyContent: 'center'}]}>
                    <Text style={styles.epaFormCellValueBold}>X</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {flex: 3}]}>
                    <Text style={styles.epaFormCellLabelSmall}>1</Text>
                    <Text style={styles.epaFormCellValue}>UN1950, Waste Aerosols, flammable 2.1</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 80}]}>
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>1</Text>
                      <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>CF</Text>
                    </View>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 60}]}>
                    <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>00001</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 40}]}>
                    <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>P</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 100}]}>
                    <Text style={styles.epaFormCellValue}>311</Text>
                    <Text style={styles.epaFormCellValue}>D001</Text>
                  </View>
                </View>

                {/* Waste Row 2 */}
                <View style={styles.epaWasteTableRow}>
                  <View style={[styles.epaWasteTableCell, {width: 30, justifyContent: 'center'}]}>
                    <Text style={styles.epaFormCellValueBold}>X</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {flex: 3}]}>
                    <Text style={styles.epaFormCellLabelSmall}>2</Text>
                    <Text style={styles.epaFormCellValue}>UN2924, Waste Flammable liquids, corrosive, n.o.s. (ISOPROPYL ALCOHOL, AMMONIA), 3 (8), PG II</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 80}]}>
                    <View style={{flexDirection: 'row'}}>
                      <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>1</Text>
                      <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>CF</Text>
                    </View>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 60}]}>
                    <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>00002</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 40}]}>
                    <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>P</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 100}]}>
                    <Text style={styles.epaFormCellValue}>311</Text>
                    <Text style={styles.epaFormCellValue}>D001</Text>
                    <Text style={styles.epaFormCellValue}>D002</Text>
                  </View>
                </View>

                {/* Empty Waste Rows */}
                <View style={styles.epaWasteTableRow}>
                  <View style={[styles.epaWasteTableCell, {width: 30}]} />
                  <View style={[styles.epaWasteTableCell, {flex: 3}]}>
                    <Text style={styles.epaFormCellLabelSmall}>3</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 80}]} />
                  <View style={[styles.epaWasteTableCell, {width: 60}]} />
                  <View style={[styles.epaWasteTableCell, {width: 40}]} />
                  <View style={[styles.epaWasteTableCell, {width: 100}]} />
                </View>

                <View style={styles.epaWasteTableRow}>
                  <View style={[styles.epaWasteTableCell, {width: 30}]} />
                  <View style={[styles.epaWasteTableCell, {flex: 3}]}>
                    <Text style={styles.epaFormCellLabelSmall}>4</Text>
                  </View>
                  <View style={[styles.epaWasteTableCell, {width: 80}]} />
                  <View style={[styles.epaWasteTableCell, {width: 60}]} />
                  <View style={[styles.epaWasteTableCell, {width: 40}]} />
                  <View style={[styles.epaWasteTableCell, {width: 100}]} />
                </View>

                {/* Section 14: Special Handling */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>14. Special Handling Instructions and Additional Information</Text>
                    <Text style={styles.epaFormCellValue}>1.ERG#126: 114898SPW PHARMACEUTICAL AEROSOLS( INHALERS) LTD QTY</Text>
                    <Text style={styles.epaFormCellValue}>2.ERG#132: 114888SP(FLAMMABLE/CORROSIVE PHARMACEUTICALS (AMMONIA INHAL) LTD QTY</Text>
                  </View>
                </View>

                {/* Section 15: Generator Certification */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>15. GENERATOR'S/OFFEROR'S CERTIFICATION:</Text>
                    <Text style={styles.epaFormCellValueSmall}>
                      I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labeled/placarded, and are in all respects in proper condition for transport according to applicable international and national governmental regulations. If export shipment and I am the Primary Exporter, I certify that the contents of this consignment conform to the terms of the attached EPA Acknowledgment of Consent.
                    </Text>
                    <Text style={styles.epaFormCellValueSmall}>
                      I certify that the waste minimization statement identified in 40 CFR 262.27(a) (if I am a large quantity generator) or (b) (if I am a small quantity generator) is true.
                    </Text>
                    <View style={styles.epaSignatureRow}>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Generator's/Offeror's Printed/Typed Name</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
                        {manifestData?.signatureImageUri ? (
                          <Image
                            source={{uri: manifestData.signatureImageUri}}
                            style={{
                              height: 40,
                              width: '100%',
                              borderWidth: 1,
                              borderColor: '#000000',
                              borderRadius: borderRadius.sm,
                            }}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.epaSignatureLine} />
                        )}
                      </View>
                      <View style={styles.epaDateBox}>
                        <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
                        <View style={styles.epaDateRow}>
                          <Text style={styles.epaDateValue}>11</Text>
                          <Text style={styles.epaDateValue}>14</Text>
                          <Text style={styles.epaDateValue}>2025</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Transporter Section */}
                <View style={styles.epaFormSectionHeader}>
                  <Text style={styles.epaFormSectionHeaderText}>TRANSPORTER</Text>
                </View>

                {/* Section 16: International Shipments */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>16. International Shipments</Text>
                    <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
                      <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                      <Text style={styles.epaFormCellValue}>Import to U.S.</Text>
                      <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                      <Text style={styles.epaFormCellValue}>Export from U.S.</Text>
                    </View>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabelSmall}>Port of entry/exit:</Text>
                    <Text style={styles.epaFormCellLabelSmall}>Date leaving U.S.:</Text>
                  </View>
                </View>

                {/* Section 17: Transporter Acknowledgment */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>17. Transporter Acknowledgment of Receipt of Materials</Text>
                    <View style={styles.epaSignatureRow}>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Transporter 1 Printed/Typed Name</Text>
                        <Text style={styles.epaFormCellValueBold}>Aaron Cayson</Text>
                      </View>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={styles.epaDateBox}>
                        <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
                        <View style={styles.epaDateRow}>
                          <Text style={styles.epaDateValue}>11</Text>
                          <Text style={styles.epaDateValue}>14</Text>
                          <Text style={styles.epaDateValue}>2025</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.epaSignatureRow, {marginTop: 8}]}>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Transporter 2 Printed/Typed Name</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={styles.epaDateBox}>
                        <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
                        <View style={styles.epaDateRow}>
                          <Text style={styles.epaDateValue}></Text>
                          <Text style={styles.epaDateValue}></Text>
                          <Text style={styles.epaDateValue}></Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Designated Facility Section */}
                <View style={styles.epaFormSectionHeader}>
                  <Text style={styles.epaFormSectionHeaderText}>DESIGNATED FACILITY</Text>
                </View>

                {/* Section 18: Discrepancy */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>18. Discrepancy</Text>
                  </View>
                </View>
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>18a. Discrepancy Indication Space</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center'}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                        <Text style={styles.epaFormCellValue}>Quantity</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                        <Text style={styles.epaFormCellValue}>Type</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                        <Text style={styles.epaFormCellValue}>Residue</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                        <Text style={styles.epaFormCellValue}>Partial Rejection</Text>
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
                        <Text style={styles.epaFormCellValue}>Full Rejection</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabelSmall}>Manifest Reference Number:</Text>
                  </View>
                </View>

                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>18b. Alternate Facility (or Generator)</Text>
                  </View>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                  </View>
                </View>

                {/* Section 19: Hazardous Waste Report */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>19. Hazardous Waste Report Management Method Codes (i.e., codes for hazardous waste treatment, disposal, and recycling systems)</Text>
                    <View style={{flexDirection: 'row'}}>
                      <View style={{flex: 1}}>
                        <Text style={styles.epaFormCellLabelSmall}>1.</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.epaFormCellLabelSmall}>2.</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.epaFormCellLabelSmall}>3.</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.epaFormCellLabelSmall}>4.</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Section 20: Designated Facility Certification */}
                <View style={styles.epaFormRow}>
                  <View style={[styles.epaFormCell, {flex: 1}]}>
                    <Text style={styles.epaFormCellLabel}>20. Designated Facility Owner or Operator: Certification of receipt of hazardous materials covered by the manifest except as noted in Item 18a</Text>
                    <View style={styles.epaSignatureRow}>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Printed/Typed Name</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={{flex: 2}}>
                        <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
                        <View style={styles.epaSignatureLine} />
                      </View>
                      <View style={styles.epaDateBox}>
                        <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
                        <View style={styles.epaDateRow}>
                          <Text style={styles.epaDateValue}></Text>
                          <Text style={styles.epaDateValue}></Text>
                          <Text style={styles.epaDateValue}></Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.epaFormFooter}>
                  <Text style={styles.epaFormFooterText}>EPA Form 8700-22 (Rev. 12-17) Previous editions are obsolete.</Text>
                  <Text style={styles.epaFormFooterHighlight}>DESIGNATED FACILITY TO EPA's e-MANIFEST SYSTEM</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.manifestPreviewFooter}>
              <Button
                title="Close"
                variant="outline"
                size="lg"
                onPress={() => setShowPrintPreview(false)}
                style={{flex: 1}}
              />
              <Button
                title="Print Manifest"
                variant="primary"
                size="lg"
                onPress={async () => {
                  setShowPrintPreview(false);
                  await printManifest();
                }}
                style={{flex: 1}}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Print Options Modal */}
        <Modal
          visible={showPrintOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPrintOptions(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={{flex: 1}}
              activeOpacity={1}
              onPress={() => setShowPrintOptions(false)}
            />
            <View style={styles.bottomSheetContent}>
              {/* Bottom Sheet Handle */}
              <View style={styles.bottomSheetHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Print Options</Text>
              </View>

              <ScrollView 
                contentContainerStyle={styles.bottomSheetBodyContent}
                showsVerticalScrollIndicator={true}>
                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={async () => {
                    setShowPrintOptions(false);
                    await printManifest();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                    <Icon name="print" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Print Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Print the hazardous waste manifest document
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={async () => {
                    setShowPrintOptions(false);
                    await printLDR();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Icon name="description" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Print LDR</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Print the Land Disposal Restrictions notification
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => {
                    setShowPrintOptions(false);
                    voidManifest();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEE2E2'}]}>
                    <Icon name="error" size={24} color={colors.destructive} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Void Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Void the current manifest document
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.bottomSheetCancelButton}
                  onPress={() => setShowPrintOptions(false)}>
                  <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const MaterialsSuppliesScreen = () => {
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

    if (!selectedOrderData) return null;
    
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
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
                  order
                </Text>

                {materialsSupplies.length > 0 ? (
                  <View style={styles.materialsTable}>
                    <View style={styles.materialsTableHeader}>
                      <Text style={styles.materialsTableHeaderText}>
                        Item #
                      </Text>
                      <Text style={styles.materialsTableHeaderText}>
                        Description
                      </Text>
                      <Text style={styles.materialsTableHeaderText}>Qty</Text>
                      <Text style={styles.materialsTableHeaderText}>Type</Text>
                      <Text style={styles.materialsTableHeaderText}>
                        Action
                      </Text>
                    </View>
                    {materialsSupplies.map((material, index) => (
                      <View key={material.id} style={styles.materialsTableRow}>
                        <Text style={styles.materialsTableCell}>
                          {material.itemNumber}
                        </Text>
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
                                handleStartEditQuantity(
                                  material.id,
                                  material.quantity,
                                )
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
                            variant={
                              material.type === 'used' ? 'default' : 'secondary'
                            }>
                            {material.type === 'used' ? 'Used' : 'Left Behind'}
                          </Badge>
                        </View>
                        <View style={styles.materialsTableCell}>
                          <TouchableOpacity
                            onPress={() => handleDeleteMaterial(material.id)}
                            disabled={isCurrentOrderCompleted}
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
            title="Done"
            variant="primary"
            size="md"
            onPress={() => {
              // Return to manifest-management (main workflow step)
              setCurrentStep('manifest-management');
            }}
          />
        </View>
      </View>
    );
  };

  const EquipmentPPEScreen = () => {
    const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(
      null,
    );
    const [editEquipmentCount, setEditEquipmentCount] = useState('');
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
      const newEquipment = {
        id: `eq-${Date.now()}`,
        name: selectedEquipmentItem,
        count: parseInt(equipmentQuantity) || 1,
      };
      setEquipmentPPE(prev => [...prev, newEquipment]);
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

    const handleStartEditCount = (id: string, currentCount: number) => {
      setEditingEquipmentId(id);
      setEditEquipmentCount(String(currentCount));
    };

    const handleSaveCount = (id: string) => {
      const newCount = parseInt(editEquipmentCount) || 1;
      setEquipmentPPE(prev =>
        prev.map(e => (e.id === id ? {...e, count: newCount} : e)),
      );
      setEditingEquipmentId(null);
      setEditEquipmentCount('');
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
        />

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Equipment & PPE</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text style={styles.cardDescription}>
                  Track equipment and PPE items used during service completion
                </Text>

                {equipmentPPE.length > 0 ? (
                  <View style={styles.materialsTable}>
                    <View style={styles.materialsTableHeader}>
                      <Text style={styles.materialsTableHeaderText}>
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
                          {editingEquipmentId === equipment.id ? (
                            <View style={styles.quantityEditContainer}>
                              <TextInput
                                style={styles.quantityEditInput}
                                value={editEquipmentCount}
                                onChangeText={setEditEquipmentCount}
                                keyboardType="numeric"
                                autoFocus
                              />
                              <TouchableOpacity
                                onPress={() => handleSaveCount(equipment.id)}
                                style={styles.quantityEditButton}>
                                <Icon name="check" size={20} color={colors.primaryForeground} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingEquipmentId(null);
                                  setEditEquipmentCount('');
                                }}
                                style={styles.quantityEditButton}>
                                <Icon name="close" size={20} color={colors.foreground} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() =>
                                handleStartEditCount(
                                  equipment.id,
                                  equipment.count,
                                )
                              }>
                              <Text style={styles.materialsTableQuantity}>
                                {equipment.count}
                              </Text>
                            </TouchableOpacity>
                          )}
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

                <Button
                  title="Add Equipment & PPE"
                  variant="primary"
                  size="md"
                  onPress={() => setShowAddEquipmentModal(true)}
                  style={styles.addMaterialButton}
                />
              </CardContent>
            </Card>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <Button
            title="Done"
            variant="primary"
            size="md"
            onPress={() => setCurrentStep('manifest-management')}
          />
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

  const OrderServiceScreen = () => {
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
      const allServiceTypesComplete = selectedOrderData.programs.every(serviceTypeId => {
        const entry = serviceTypeTimeEntries.get(serviceTypeId);
        return entry?.startTime != null && entry?.endTime != null;
      });

      if (allServiceTypesComplete) {
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
        // Reset state
        setAddedContainers([]);
        setSelectedPrograms({});
        setMaterialsSupplies([]);
        setEquipmentPPE([]);
        setBarcode('');
        setTareWeight('45');
        setGrossWeight('285');
        setCustomerFirstName('');
        setCustomerLastName('');
        setCustomerEmail('');
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
          onServiceTypeBadgePress={handleServiceTypeBadgePress}
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

  // Main fixed footer navigation icon color
  const FOOTER_NAV_ICON_COLOR = '#0092bc';

  // Quick Actions Bar - shows on all order workflow screens
  const QuickActionsBar = () => {
    if (!selectedOrderData || currentStep === 'dashboard') {
      return null;
    }

    // Show the document type selector modal
    const handleScanDocuments = () => {
      setShowDocumentTypeSelector(true);
    };

    // After document type is selected, show capture method options
    const captureDocument = async (documentType: 'manifest' | 'ldr' | 'bol') => {
      setShowDocumentTypeSelector(false);
      setPendingDocumentType(documentType);
      setShowCaptureMethodSelector(true);
    };

    // Handle the actual capture based on method
    const handleCaptureWithMethod = async (method: 'camera' | 'gallery') => {
      setShowCaptureMethodSelector(false);
      const documentType = pendingDocumentType;
      if (!documentType) return;
      
      const typeLabels = {manifest: 'Manifest', ldr: 'LDR', bol: 'BOL'};
      
      try {
        const methodLabel = method === 'camera' ? 'Camera' : 'Gallery';
        
        // Create document entry with metadata (no image URI needed for demo)
        setScannedDocuments(prev => [
          ...prev,
          {
            id: `doc-${Date.now()}`,
            uri: `mock://${documentType}-${method}-${Date.now()}`, // Placeholder URI
            timestamp: new Date().toISOString(),
            orderNumber: selectedOrderData?.orderNumber || '',
            documentType: documentType,
            captureMethod: methodLabel, // Store capture method for display
          },
        ]);
        
        Alert.alert('Success', `${typeLabels[documentType]} captured via ${methodLabel}!`);
      } catch (error: any) {
        console.error('Document capture error:', error);
        Alert.alert('Error', 'Failed to capture document');
      }
    };

    // Legacy capture function (kept for web platform if needed)
    const legacyCaptureDocument = async (documentType: 'manifest' | 'ldr' | 'bol') => {
      const typeLabels = {manifest: 'Manifest', ldr: 'LDR', bol: 'BOL'};
      
      try {
        // Check if we're on web or native
        if (Platform.OS === 'web') {
          // Web platform - use MediaDevices API for camera access
          try {
            // @ts-ignore - navigator.mediaDevices is available on web
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              // Create a modal overlay for camera preview
              // @ts-ignore
              const overlay = document.createElement('div');
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              `;

              // Create video element for camera preview
              // @ts-ignore
              const video = document.createElement('video');
              video.style.cssText = `
                max-width: 90%;
                max-height: 70%;
                border-radius: 12px;
                background: #000;
              `;
              video.autoplay = true;
              video.playsInline = true;

              // Create canvas for capturing
              // @ts-ignore
              const canvas = document.createElement('canvas');
              canvas.style.display = 'none';

              // Create header with document type
              // @ts-ignore
              const header = document.createElement('div');
              header.style.cssText = `
                color: white;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 20px;
                text-align: center;
              `;
              header.textContent = `Scanning ${typeLabels[documentType]}`;

              // Create capture button
              // @ts-ignore
              const captureBtn = document.createElement('button');
              captureBtn.style.cssText = `
                margin-top: 24px;
                padding: 16px 48px;
                font-size: 18px;
                font-weight: 600;
                background: #65B230;
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                min-height: 56px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              `;
              // Material Icons camera_alt codepoint (U+E3B0) - no emoji
              captureBtn.innerHTML = '<span style="font-family:MaterialIcons;font-size:24px;line-height:1">\uE3B0</span> Capture Photo';

              // Create cancel button
              // @ts-ignore
              const cancelBtn = document.createElement('button');
              cancelBtn.style.cssText = `
                margin-top: 12px;
                padding: 12px 32px;
                font-size: 16px;
                background: transparent;
                color: white;
                border: 2px solid white;
                border-radius: 8px;
                cursor: pointer;
              `;
              cancelBtn.textContent = 'Cancel';

              overlay.appendChild(header);
              overlay.appendChild(video);
              overlay.appendChild(canvas);
              overlay.appendChild(captureBtn);
              overlay.appendChild(cancelBtn);
              // @ts-ignore
              document.body.appendChild(overlay);

              // Get camera stream - prefer back camera for document scanning
              // @ts-ignore - mediaDevices is available in modern browsers
              const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: 'environment', // Use back camera
                  width: {ideal: 1920},
                  height: {ideal: 1080},
                },
              });

              video.srcObject = stream;

              // Capture photo on button click
              captureBtn.onclick = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0);
                  const imageUri = canvas.toDataURL('image/jpeg', 0.8);
                  
                  // Stop camera stream
                  // @ts-ignore
                  stream.getTracks().forEach((track: any) => track.stop());
                  // @ts-ignore
                  document.body.removeChild(overlay);

                  // Store scanned document with type
                  setScannedDocuments(prev => [
                    ...prev,
                    {
                      id: `doc-${Date.now()}`,
                      uri: imageUri,
                      timestamp: new Date().toISOString(),
                      orderNumber: selectedOrderData?.orderNumber || '',
                      documentType: documentType,
                    },
                  ]);
                  Alert.alert('Success', `${typeLabels[documentType]} captured successfully`);
                }
              };

              // Cancel on button click
              cancelBtn.onclick = () => {
                // @ts-ignore
                stream.getTracks().forEach((track: any) => track.stop());
                // @ts-ignore
                document.body.removeChild(overlay);
              };
            } else {
              throw new Error('Camera not supported');
            }
          } catch (cameraError) {
            // Fallback to file input if camera access fails
            console.log('Camera access failed, falling back to file picker:', cameraError);
            // @ts-ignore - document is available on web
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = event => {
                  const imageUri = event.target?.result as string;
                  setScannedDocuments(prev => [
                    ...prev,
                    {
                      id: `doc-${Date.now()}`,
                      uri: imageUri,
                      timestamp: new Date().toISOString(),
                      orderNumber: selectedOrderData?.orderNumber || '',
                      documentType: documentType,
                    },
                  ]);
                  Alert.alert('Success', `${typeLabels[documentType]} captured successfully`);
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }
        } else {
          // Native platform - Mock document capture (camera module not linked)
          try {
            // Create a mock document entry without requiring camera
            const typeLabels = {manifest: 'Manifest', ldr: 'LDR', bol: 'BOL'};
            const typeColors = {manifest: '#DBEAFE', ldr: '#FEF3C7', bol: '#D1FAE5'};
            
            // Generate a placeholder image URI
            const mockImageUri = `data:image/svg+xml;base64,${btoa(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="${typeColors[documentType]}"/>
                <text x="200" y="150" font-size="24" text-anchor="middle" fill="#333">
                  ${typeLabels[documentType]} Document
                </text>
                <text x="200" y="180" font-size="16" text-anchor="middle" fill="#666">
                  Captured: ${new Date().toLocaleString()}
                </text>
              </svg>
            `)}`;

            // Store scanned document with type
            setScannedDocuments(prev => [
              ...prev,
              {
                id: `doc-${Date.now()}`,
                uri: mockImageUri,
                timestamp: new Date().toISOString(),
                orderNumber: selectedOrderData?.orderNumber || '',
                documentType: documentType,
              },
            ]);
            
            Alert.alert('Success', `${typeLabels[documentType]} captured successfully (mock)`);
          } catch (error) {
            Alert.alert('Error', 'Failed to capture document');
          }
        }
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.message || 'Failed to capture document. Please try again.',
        );
      }
    };

    // Calculate counts for badges (use active count so drop updates badge)
    const containersCount = activeContainerCount;
    const scannedDocsCount = scannedDocuments.filter(
      doc => doc.orderNumber === selectedOrderData?.orderNumber,
    ).length;
    const materialsCount = materialsSupplies.length;
    const equipmentCount = equipmentPPE.length;

    return (
      <View style={styles.quickActionsBar}>
        {/* Home Button */}
        <TouchableOpacity
          style={styles.quickActionHomeButton}
          onPress={() => setCurrentStep('dashboard')}
          activeOpacity={0.7}>
          <Icon name="home" size={24} color={FOOTER_NAV_ICON_COLOR} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickActionButton,
            isTablet() && styles.quickActionButtonTablet,
          ]}
          onPress={() => setCurrentStep('container-summary')}
          activeOpacity={0.7}>
          <View style={styles.quickActionContent}>
            <Icon name="assignment" size={24} color={FOOTER_NAV_ICON_COLOR} />
            <Text style={styles.quickActionLabel}>Containers</Text>
            {containersCount > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>
                  {containersCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickActionButton,
            isTablet() && styles.quickActionButtonTablet,
          ]}
          onPress={() => setCurrentStep('materials-supplies')}
          activeOpacity={0.7}>
          <View style={styles.quickActionContent}>
            <Icon name="inventory" size={24} color={FOOTER_NAV_ICON_COLOR} />
            <Text
              style={styles.quickActionLabel}
              numberOfLines={1}
              adjustsFontSizeToFit>
              Materials
            </Text>
            {materialsCount > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>
                  {materialsCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            isTablet() && styles.quickActionButtonTablet,
          ]}
          onPress={() => setCurrentStep('equipment-ppe')}
          activeOpacity={0.7}>
          <View style={styles.quickActionContent}>
            <Icon name="security" size={24} color={FOOTER_NAV_ICON_COLOR} />
            <Text
              style={styles.quickActionLabel}
              numberOfLines={1}
              adjustsFontSizeToFit>
              Equipment
            </Text>
            {equipmentCount > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>
                  {equipmentCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Photo Capture Button */}
        {selectedOrderData && (
          <PhotoCaptureButton
            orderNumber={selectedOrderData.orderNumber}
            iconColor={FOOTER_NAV_ICON_COLOR}
            onPhotoAdded={() => {
              // Photo added successfully
            }}
            onViewPhotos={() => setShowPhotoGallery(true)}
            onScanDocument={() => {
              // Navigate to document scanning (existing functionality)
              if (scannedDocsCount > 0) {
                setShowDocumentOptionsMenu(true);
              } else {
                setShowDocumentTypeSelector(true);
              }
            }}
            style={[
              styles.quickActionButton,
              isTablet() && styles.quickActionButtonTablet,
            ]}
          />
        )}

        {/* Document Options Menu - Bottom Sheet */}
        <Modal
          visible={showDocumentOptionsMenu}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDocumentOptionsMenu(false)}>
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setShowDocumentOptionsMenu(false)}>
            <TouchableOpacity
              style={styles.bottomSheetContainer}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}>
              {/* Drag Handle */}
              <View style={styles.bottomSheetHandle} />
              
              <View style={styles.bottomSheetHeader}>
                <View style={styles.bottomSheetTitleRow}>
                  <Icon name="camera-alt" size={20} color={colors.foreground} style={styles.bottomSheetTitleIcon} />
                  <Text style={styles.bottomSheetTitle}>Documents</Text>
                </View>
                <Text style={styles.bottomSheetSubtitle}>
                  {scannedDocsCount} document{scannedDocsCount !== 1 ? 's' : ''} scanned for this order
                </Text>
              </View>
              
              <View style={styles.bottomSheetContent}>
                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => {
                    setShowDocumentOptionsMenu(false);
                    setShowScannedDocumentsViewer(true);
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                    <Icon name="assignment" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>View Documents</Text>
                    <Text style={styles.bottomSheetOptionDesc}>See all scanned documents</Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => {
                    setShowDocumentOptionsMenu(false);
                    handleScanDocuments();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#D1FAE5'}]}>
                    <Icon name="camera-alt" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Scan New Document</Text>
                    <Text style={styles.bottomSheetOptionDesc}>Capture manifest, LDR, or BOL</Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.bottomSheetCancelButton}
                  onPress={() => setShowDocumentOptionsMenu(false)}>
                  <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Document Type Selector - Bottom Sheet */}
        <Modal
          visible={showDocumentTypeSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDocumentTypeSelector(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={{flex: 1}}
              activeOpacity={1}
              onPress={() => setShowDocumentTypeSelector(false)}
            />
            <View style={styles.bottomSheetContent}>
              {/* Drag Handle */}
              <View style={styles.bottomSheetHandle} />
              
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Document Type</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  Choose the type of document you want to scan
                </Text>
              </View>
              
              <ScrollView 
                contentContainerStyle={styles.bottomSheetBodyContent}
                showsVerticalScrollIndicator={true}>
                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => captureDocument('manifest')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                    <Icon name="assignment" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Hazardous waste manifest (EPA Form 8700-22)
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => captureDocument('ldr')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Icon name="description" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>LDR</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Land Disposal Restrictions notification
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => captureDocument('bol')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#D1FAE5'}]}>
                    <Icon name="local-shipping" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>BOL</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Bill of Lading for shipment
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.bottomSheetCancelButton}
                  onPress={() => setShowDocumentTypeSelector(false)}>
                  <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Capture Method Selector - Camera or Gallery */}
        <Modal
          visible={showCaptureMethodSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCaptureMethodSelector(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={{flex: 1}}
              activeOpacity={1}
              onPress={() => setShowCaptureMethodSelector(false)}
            />
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHandle} />
              
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Capture Method</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  Choose how to capture the document
                </Text>
              </View>
              
              <ScrollView 
                contentContainerStyle={styles.bottomSheetBodyContent}
                showsVerticalScrollIndicator={true}>
                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => handleCaptureWithMethod('camera')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                    <Icon name="camera-alt" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Take Photo</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Use camera to capture the document
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => handleCaptureWithMethod('gallery')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Icon name="folder" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Choose from Files</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Select an existing image file
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.bottomSheetCancelButton}
                  onPress={() => setShowCaptureMethodSelector(false)}>
                  <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Scanned Documents Viewer Modal */}
        <Modal
          visible={showScannedDocumentsViewer}
          transparent
          animationType="slide"
          onRequestClose={() => setShowScannedDocumentsViewer(false)}>
          <View style={styles.scannedDocsViewerContainer}>
            <View style={styles.scannedDocsViewerHeader}>
              <View>
                <Text style={styles.scannedDocsViewerTitle}>Scanned Documents</Text>
                <Text style={styles.scannedDocsViewerSubtitle}>
                  {selectedOrderData?.orderNumber || 'Order'} • {scannedDocsCount} document{scannedDocsCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.scannedDocsViewerCloseBtn}
                onPress={() => setShowScannedDocumentsViewer(false)}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scannedDocsViewerScroll}
              contentContainerStyle={styles.scannedDocsViewerScrollContent}>
              {scannedDocuments
                .filter(doc => doc.orderNumber === selectedOrderData?.orderNumber)
                .map(doc => {
                  const typeLabels = {manifest: 'Manifest', ldr: 'LDR', bol: 'BOL'};
                  const typeColors = {manifest: '#DBEAFE', ldr: '#FEF3C7', bol: '#D1FAE5'};
                  const getDocumentIconName = (type: 'manifest' | 'ldr' | 'bol') => {
                    switch (type) {
                      case 'manifest':
                        return 'assignment';
                      case 'ldr':
                        return 'description';
                      case 'bol':
                        return 'local-shipping';
                      default:
                        return 'description';
                    }
                  };
                  const captureMethod = (doc as any).captureMethod || 'Camera';
                  const methodIconName = captureMethod === 'Camera' ? 'camera-alt' : 'folder';
                  
                  return (
                    <View key={doc.id} style={styles.scannedDocCard}>
                      {/* Document visual placeholder */}
                      <View 
                        style={[
                          styles.scannedDocThumbnailContainer, 
                          {backgroundColor: typeColors[doc.documentType]}
                        ]}>
                        <View style={styles.scannedDocPlaceholderContent}>
                          <Icon 
                            name={getDocumentIconName(doc.documentType)} 
                            size={32} 
                            color={colors.foreground} 
                            style={styles.scannedDocPlaceholderIcon}
                          />
                          <Icon 
                            name={methodIconName} 
                            size={16} 
                            color={colors.mutedForeground} 
                            style={styles.scannedDocPlaceholderMethod}
                          />
                        </View>
                      </View>
                      <View style={styles.scannedDocInfo}>
                        <View style={[styles.scannedDocTypeBadge, {backgroundColor: typeColors[doc.documentType]}]}>
                          <Icon 
                            name={getDocumentIconName(doc.documentType)} 
                            size={16} 
                            color={colors.foreground} 
                            style={styles.scannedDocTypeIcon}
                          />
                          <Text style={styles.scannedDocTypeLabel}>{typeLabels[doc.documentType]}</Text>
                        </View>
                        <Text style={styles.scannedDocTimestamp}>
                          {new Date(doc.timestamp).toLocaleString()}
                        </Text>
                        <Text style={styles.scannedDocMethod}>
                          via {captureMethod}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.scannedDocDeleteBtn}
                        onPress={() => {
                          Alert.alert(
                            'Delete Document',
                            `Are you sure you want to delete this ${typeLabels[doc.documentType]}?`,
                            [
                              {text: 'Cancel', style: 'cancel'},
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => {
                                  setScannedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                },
                              },
                            ]
                          );
                        }}>
                        <Icon name="delete" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  );
                })}

              {scannedDocsCount === 0 && (
                <View style={styles.scannedDocsEmptyState}>
                  <Icon name="camera-alt" size={64} color={colors.mutedForeground} style={styles.scannedDocsEmptyIcon} />
                  <Text style={styles.scannedDocsEmptyTitle}>No Documents Scanned</Text>
                  <Text style={styles.scannedDocsEmptySubtitle}>
                    Tap "Scan Documents" to capture manifests, LDRs, or BOLs
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.scannedDocsViewerFooter}>
              <Button
                title="Add New Document"
                variant="primary"
                size="lg"
                onPress={() => {
                  setShowScannedDocumentsViewer(false);
                  handleScanDocuments();
                }}
                style={{flex: 1}}
              />
              <Button
                title="Close"
                variant="outline"
                size="lg"
                onPress={() => setShowScannedDocumentsViewer(false)}
                style={{flex: 1}}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 'dashboard':
        // Use master-detail on tablets in landscape mode if enabled, otherwise use full-screen
        // In portrait mode, always use full-screen for better UX
        if (isTablet() && useMasterDetail && isLandscape()) {
          return <DashboardScreenMasterDetail />;
        }
        return <DashboardScreen />;
      case 'stream-selection':
        return <StreamSelectionScreen />;
      case 'container-selection':
        return <ContainerSelectionScreen />;
      case 'container-entry':
        return <ContainerEntryScreen />;
      case 'container-summary':
        return <ContainerSummaryScreen />;
      case 'manifest-management':
        return <ManifestManagementScreen />;
      case 'materials-supplies':
        return <MaterialsSuppliesScreen />;
      case 'equipment-ppe':
        return <EquipmentPPEScreen />;
      case 'order-service':
        return <OrderServiceScreen />;
      default:
        // In portrait mode, always use full-screen for better UX
        if (isTablet() && useMasterDetail && isLandscape()) {
          return <DashboardScreenMasterDetail />;
        }
        return <DashboardScreen />;
    }
  };

  // FR-3a.EXT.3.3: Record drop — transition selected containers to Dropped/Closed, persist weights, update aggregation
  const handleRecordDrop = useCallback(
    async (
      transferLocation: string,
      dropDate: string,
      dropTime: string,
      selectedContainerIds: string[],
    ) => {
      try {
        const containerWeights: Record<string, number> = {};
        addedContainers.forEach(c => {
          if (selectedContainerIds.includes(c.id)) containerWeights[c.id] = c.netWeight;
        });
        await recordContainerDrop(
          selectedContainerIds,
          containerWeights,
          transferLocation,
          dropDate,
          dropTime,
          truckId,
        );
        setAddedContainers(prev =>
          prev.map(c =>
            selectedContainerIds.includes(c.id) ? { ...c, status: 'dropped' as const } : c,
          ),
        );
        setShowDropWasteModal(false);
        Alert.alert(
          'Drop Recorded',
          `Successfully recorded drop at ${transferLocation} on ${dropDate} at ${dropTime}. Running total updated.`,
          [{ text: 'OK' }],
        );
      } catch (error) {
        console.error('Error recording drop:', error);
        Alert.alert(
          'Error',
          'Failed to record drop. Please try again.',
          [{ text: 'OK' }],
        );
      }
    },
    [addedContainers, truckId],
  );

  // Handle modal close request
  const handleJobNotesModalClose = useCallback(() => {
    setShowJobNotesModal(false);
  }, []);

  // Get order and notes data
  const jobNotesOrder = selectedOrderData;
  const hasJobNotes = jobNotesOrder && (
    jobNotesOrder.customerSpecialInstructions ||
    jobNotesOrder.siteAccessNotes ||
    (jobNotesOrder.safetyWarnings && jobNotesOrder.safetyWarnings.length > 0) ||
    (jobNotesOrder.previousServiceNotes && jobNotesOrder.previousServiceNotes.length > 0)
  );
  const lastThreeNotes = jobNotesOrder?.previousServiceNotes
    ? jobNotesOrder.previousServiceNotes.slice(0, 3)
    : [];

  // Load persisted validation issues when order changes
  useEffect(() => {
    if (selectedOrderData) {
      // Load persisted issues immediately (synchronous for now, but could be async)
      const persisted = getPersistedIssues(selectedOrderData.orderNumber);
      setPersistedValidationIssues(persisted);
      
      // Also trigger a re-validation to ensure persisted issues are up to date
      // This will be handled by the persist effect below
    } else {
      setPersistedValidationIssues([]);
    }
  }, [selectedOrderData?.orderNumber]);

  // Validation system - check all workflow validation points
  const currentValidationIssues = useMemo((): ValidationIssue[] => {
    if (!selectedOrderData) return [];

    const issues: ValidationIssue[] = [];

    // Check for scanned manifest
    const hasScannedManifest = scannedDocuments.some(
      doc => doc.orderNumber === selectedOrderData.orderNumber && doc.documentType === 'manifest'
    );
    if (!hasScannedManifest) {
      issues.push({
        id: 'missing-manifest',
        message: 'Scanned manifest document is missing',
        severity: 'error',
        screen: 'manifest-management',
        description: 'A scanned manifest document is required before completing the order.',
      });
    }

    // Check if no containers were added
    if (addedContainers.length === 0) {
      issues.push({
        id: 'no-containers',
        message: 'No containers have been added',
        severity: 'warning',
        screen: 'container-selection',
        description: 'At least one container must be added to the order.',
      });
    }

    // Check if programs are not all selected
    const allProgramsSelected = selectedOrderData.programs.every(
      program => selectedPrograms[program]
    );
    if (!allProgramsSelected && selectedOrderData.programs.length > 0) {
      issues.push({
        id: 'incomplete-programs',
        message: 'Not all programs have been selected',
        severity: 'warning',
        screen: 'manifest-management',
        description: 'All programs must have a ship/noship selection.',
      });
    }

    // Check for customer acknowledgment (if on order-service screen)
    // This would be checked when trying to complete, but we can show a warning
    // Note: We can't check customerFirstName/LastName here as they're local to OrderServiceScreen
    // But we can add a general check if needed

    return issues;
  }, [selectedOrderData, scannedDocuments, addedContainers, selectedPrograms]);

  // Merge current validation issues with persisted ones
  // Persisted issues are kept until they're resolved (no longer in current issues)
  // Always show persisted issues - they'll be removed by updateValidationIssues when resolved
  const validationIssues = useMemo(() => {
    if (!selectedOrderData) {
      // Even if no order is selected, we might want to show persisted issues
      // But for now, return empty
      return [];
    }

    // Get current issues
    const currentIssues = currentValidationIssues;
    
    // Always include ALL persisted issues - they persist until resolved
    // Current issues take precedence (in case details changed)
    const currentIssueIds = new Set(currentIssues.map(issue => issue.id));
    
    // Merge: current issues + persisted issues that aren't already in current
    // This ensures persisted issues remain visible until actually resolved
    const merged = [
      ...currentIssues,
      ...persistedValidationIssues.filter(p => !currentIssueIds.has(p.id))
    ];
    
    return merged;
  }, [currentValidationIssues, persistedValidationIssues, selectedOrderData]);

  // Persist validation issues when they change
  useEffect(() => {
    if (!selectedOrderData) return;

    const persistIssues = async () => {
      // Only update persisted issues if we have current validation results
      // This prevents clearing persisted issues when validation hasn't run yet
      // Note: currentValidationIssues should always run, but we add this safeguard
      const updated = await updateValidationIssues(
        selectedOrderData.orderNumber,
        currentValidationIssues
      );
      setPersistedValidationIssues(updated);
    };

    persistIssues();
  }, [selectedOrderData?.orderNumber, currentValidationIssues]);

  // Calculate validation state
  const validationState = useMemo(() => {
    const errors = validationIssues.filter(i => i.severity === 'error');
    const warnings = validationIssues.filter(i => i.severity === 'warning');
    const totalCount = validationIssues.length;

    if (totalCount === 0) {
      return { state: 'none' as const, count: 0 };
    } else if (errors.length > 0) {
      return { state: 'error' as const, count: totalCount, errors, warnings };
    } else {
      return { state: 'warning' as const, count: totalCount, errors, warnings };
    }
  }, [validationIssues]);

  // Handle navigation to issue screen
  const handleNavigateToIssue = useCallback((issue: ValidationIssue) => {
    setShowValidationModal(false);
    setCurrentStep(issue.screen);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderScreen()}
      <QuickActionsBar />
      
      {/* Job Notes Modal */}
      {hasJobNotes && jobNotesOrder && (
        <Modal
          visible={showJobNotesModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleJobNotesModalClose}>
          <SafeAreaView style={styles.jobNotesModalContainer}>
            <View style={styles.jobNotesModalHeader}>
              <Text style={styles.jobNotesModalTitle}>Service Notes</Text>
              <TouchableOpacity
                onPress={() => setShowJobNotesModal(false)}
                style={styles.jobNotesModalCloseButton}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.jobNotesModalScroll}
              contentContainerStyle={styles.jobNotesModalContent}>
              {jobNotesOrder.customerSpecialInstructions && (
                <Card style={styles.jobNotesCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Customer Special Instructions</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.jobNotesText}>
                      {jobNotesOrder.customerSpecialInstructions}
                    </Text>
                  </CardContent>
                </Card>
              )}

              {jobNotesOrder.siteAccessNotes && (
                <Card style={styles.jobNotesCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Site Access Notes</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.jobNotesText}>
                      {jobNotesOrder.siteAccessNotes}
                    </Text>
                  </CardContent>
                </Card>
              )}

              {jobNotesOrder.safetyWarnings && jobNotesOrder.safetyWarnings.length > 0 && (
                <Card style={styles.jobNotesSafetyCard}>
                  <CardHeader>
                  <CardTitle>
                    <View style={styles.jobNotesSafetyTitleContainer}>
                      <Icon
                        name="warning"
                        size={20}
                        color={colors.destructive}
                        style={styles.jobNotesSafetyIcon}
                      />
                      <Text style={[styles.cardTitleText, styles.jobNotesSafetyTitle]}>
                        Safety Warnings
                      </Text>
                    </View>
                  </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobNotesOrder.safetyWarnings.map((warning, index) => (
                      <View key={index} style={styles.safetyWarningItem}>
                        <Text style={styles.safetyWarningText}>{warning}</Text>
                      </View>
                    ))}
                  </CardContent>
                </Card>
              )}

              {lastThreeNotes.length > 0 && (
                <Card style={styles.jobNotesCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Previous Service Notes</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lastThreeNotes.map((note, index) => (
                      <View key={index} style={styles.previousNoteItem}>
                        <View style={styles.previousNoteHeader}>
                          <Text style={styles.previousNoteDate}>{note.date}</Text>
                          {note.technician && (
                            <Text style={styles.previousNoteTechnician}>
                              {note.technician}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.previousNoteText}>{note.note}</Text>
                      </View>
                    ))}
                  </CardContent>
                </Card>
              )}

            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* All Upcoming Order Notes Modal */}
      <Modal
        visible={showAllNotesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllNotesModal(false)}>
        <SafeAreaView style={styles.jobNotesModalContainer}>
          <View style={styles.jobNotesModalHeader}>
            <Text style={styles.jobNotesModalTitle}>Upcoming Order Notes</Text>
            <TouchableOpacity
              onPress={() => setShowAllNotesModal(false)}
              style={styles.jobNotesModalCloseButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.jobNotesModalScroll}
            contentContainerStyle={styles.jobNotesModalContent}>
            {upcomingOrdersWithNotes.length === 0 ? (
              <Text style={styles.allNotesEmptyText}>
                No service notes on upcoming orders.
              </Text>
            ) : (
              upcomingOrdersWithNotes.map(order => {
                const locationParts = [order.city, order.state].filter(Boolean).join(', ');
                const locationLine = locationParts ? `${order.site} • ${locationParts}` : order.site;
                const lastThreeNotes = order.previousServiceNotes
                  ? order.previousServiceNotes.slice(0, 3)
                  : [];

                return (
                  <View key={order.orderNumber} style={styles.allNotesOrderSection}>
                    <View style={styles.allNotesOrderHeader}>
                      <Text style={styles.allNotesOrderNumber}>{order.orderNumber}</Text>
                      <Badge
                        variant={
                          getOrderStatus(order) === 'Scheduled'
                            ? 'secondary'
                            : getOrderStatus(order) === 'Partial'
                              ? 'default'
                              : getOrderStatus(order) === 'In Progress'
                                ? 'default'
                                : 'destructive'
                        }>
                        {getOrderStatus(order)}
                      </Badge>
                    </View>
                    <Text style={styles.allNotesOrderMeta}>
                      {formatCustomerWithStore(order.customer, order.site)}
                    </Text>
                    <Text style={styles.allNotesOrderMeta}>{locationLine}</Text>
                    <Text style={styles.allNotesOrderMeta}>{order.serviceDate}</Text>

                    {order.customerSpecialInstructions && (
                      <Card style={styles.jobNotesCard}>
                        <CardHeader>
                          <CardTitle>
                            <CardTitleText>Customer Special Instructions</CardTitleText>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Text style={styles.jobNotesText}>
                            {order.customerSpecialInstructions}
                          </Text>
                        </CardContent>
                      </Card>
                    )}

                    {order.siteAccessNotes && (
                      <Card style={styles.jobNotesCard}>
                        <CardHeader>
                          <CardTitle>
                            <CardTitleText>Site Access Notes</CardTitleText>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Text style={styles.jobNotesText}>{order.siteAccessNotes}</Text>
                        </CardContent>
                      </Card>
                    )}

                    {order.safetyWarnings && order.safetyWarnings.length > 0 && (
                      <Card style={styles.jobNotesSafetyCard}>
                        <CardHeader>
                          <CardTitle>
                            <View style={styles.jobNotesSafetyTitleContainer}>
                              <Icon
                                name="warning"
                                size={20}
                                color={colors.destructive}
                                style={styles.jobNotesSafetyIcon}
                              />
                              <Text style={[styles.cardTitleText, styles.jobNotesSafetyTitle]}>
                                Safety Warnings
                              </Text>
                            </View>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {order.safetyWarnings.map((warning, index) => (
                            <View key={index} style={styles.safetyWarningItem}>
                              <Text style={styles.safetyWarningText}>{warning}</Text>
                            </View>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {lastThreeNotes.length > 0 && (
                      <Card style={styles.jobNotesCard}>
                        <CardHeader>
                          <CardTitle>
                            <CardTitleText>Previous Service Notes</CardTitleText>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {lastThreeNotes.map((note, index) => (
                            <View key={index} style={styles.previousNoteItem}>
                              <View style={styles.previousNoteHeader}>
                                <Text style={styles.previousNoteDate}>{note.date}</Text>
                                {note.technician && (
                                  <Text style={styles.previousNoteTechnician}>
                                    {note.technician}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.previousNoteText}>{note.note}</Text>
                            </View>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pause Reason Modal */}
      <Modal
        visible={showPauseReasonModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPauseReasonModal(false);
          setPauseReasonSelection('');
        }}>
        <SafeAreaView style={styles.pauseModalContainer}>
          <View style={styles.pauseModalHeader}>
            <Text style={styles.pauseModalTitle}>Pause Time Tracking</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPauseReasonModal(false);
                setPauseReasonSelection('');
              }}
              style={styles.pauseModalCloseButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.pauseModalContent}>
            <Text style={styles.pauseModalText}>
              Provide a reason for pausing so the team can track downtime accurately.
            </Text>
            <View style={styles.pauseReasonOptions}>
              {pauseReasonOptions.map(option => {
                const isSelected = pauseReasonSelection === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setPauseReasonSelection(option)}
                    style={[
                      styles.pauseReasonOption,
                      isSelected && styles.pauseReasonOptionSelected,
                    ]}
                    activeOpacity={0.7}>
                    <View style={styles.pauseReasonOptionLeft}>
                      <Text
                        style={[
                          styles.pauseReasonOptionText,
                          isSelected && styles.pauseReasonOptionTextSelected,
                        ]}>
                        {option}
                      </Text>
                    </View>
                    {isSelected && (
                      <Icon
                        name="check"
                        size={18}
                        color={colors.primaryForeground}
                        style={styles.pauseReasonOptionIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.pauseModalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="lg"
                onPress={() => {
                  setShowPauseReasonModal(false);
                  setPauseReasonSelection('');
                }}
                style={styles.pauseModalActionButton}
              />
              <Button
                title="Pause Tracking"
                variant="primary"
                size="lg"
                onPress={handleConfirmPause}
                style={styles.pauseModalActionButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Offline Blocked Modal */}
      <Modal
        visible={showOfflineBlockedModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOfflineBlockedModal(false)}>
        <SafeAreaView style={styles.offlineBlockedModalContainer}>
          <View style={styles.offlineBlockedModalHeader}>
            <View style={styles.offlineBlockedModalTitleRow}>
              <Icon name="error" size={24} color={colors.destructive} />
              <Text style={styles.offlineBlockedModalTitle}>
                Offline Limit Reached
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowOfflineBlockedModal(false)}
              style={styles.offlineBlockedModalCloseButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.offlineBlockedModalContent}>
            <Text style={styles.offlineBlockedModalMessage}>
              You have been offline for more than 10 hours. To continue working, please connect to a network and sync your data.
            </Text>
            <Text style={styles.offlineBlockedModalDetails}>
              Offline Duration: {offlineStatus.offlineDurationFormatted}
            </Text>
            <Text style={styles.offlineBlockedModalDetails}>
              Last Sync: {offlineStatus.lastSyncFormatted}
            </Text>
            <View style={styles.offlineBlockedModalActions}>
              <Button
                title="OK"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => setShowOfflineBlockedModal(false)}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Validation Summary Modal */}
      <Modal
        visible={showValidationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowValidationModal(false)}>
        <SafeAreaView style={styles.validationModalContainer}>
          <View style={styles.validationModalHeader}>
            <Text style={styles.validationModalTitle}>Validation Issues</Text>
            <TouchableOpacity
              onPress={() => setShowValidationModal(false)}
              style={styles.validationModalCloseButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.validationModalScroll}
            contentContainerStyle={styles.validationModalContent}>
            {validationIssues.length === 0 ? (
              <View style={styles.validationNoIssues}>
                <Icon name="check-circle" size={48} color={colors.success} />
                <Text style={styles.validationNoIssuesText}>
                  No validation issues found
                </Text>
              </View>
            ) : (
              <>
                {validationState.errors && validationState.errors.length > 0 && (
                  <View style={styles.validationSection}>
                    <Text style={styles.validationSectionTitle}>
                      Errors ({validationState.errors.length})
                    </Text>
                    {validationState.errors.map((issue) => (
                      <TouchableOpacity
                        key={issue.id}
                        style={[styles.validationIssueItem, styles.validationIssueError]}
                        onPress={() => handleNavigateToIssue(issue)}
                        activeOpacity={0.7}>
                        <View style={styles.validationIssueContent}>
                          <Icon
                            name="warning"
                            size={20}
                            color={colors.destructive}
                            style={styles.validationIssueIcon}
                          />
                          <View style={styles.validationIssueText}>
                            <Text style={styles.validationIssueMessage}>
                              {issue.message}
                            </Text>
                            {issue.description && (
                              <Text style={styles.validationIssueDescription}>
                                {issue.description}
                              </Text>
                            )}
                            <Text style={styles.validationIssueScreen}>
                              Go to: {issue.screen.replace('-', ' ')}
                            </Text>
                          </View>
                        </View>
                        <Icon
                          name="arrow-forward"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {validationState.warnings && validationState.warnings.length > 0 && (
                  <View style={styles.validationSection}>
                    <Text style={styles.validationSectionTitle}>
                      Warnings ({validationState.warnings.length})
                    </Text>
                    {validationState.warnings.map((issue) => (
                      <TouchableOpacity
                        key={issue.id}
                        style={[styles.validationIssueItem, styles.validationIssueWarning]}
                        onPress={() => handleNavigateToIssue(issue)}
                        activeOpacity={0.7}>
                        <View style={styles.validationIssueContent}>
                          <Icon
                            name="warning"
                            size={20}
                            color={colors.destructive}
                            style={styles.validationIssueIcon}
                          />
                          <View style={styles.validationIssueText}>
                            <Text style={styles.validationIssueMessage}>
                              {issue.message}
                            </Text>
                            {issue.description && (
                              <Text style={styles.validationIssueDescription}>
                                {issue.description}
                              </Text>
                            )}
                            <Text style={styles.validationIssueScreen}>
                              Go to: {issue.screen.replace('-', ' ')}
                            </Text>
                          </View>
                        </View>
                        <Icon
                          name="arrow-forward"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Service Center Modal */}
      {serviceCenter && (
        <Modal
          visible={showServiceCenterModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowServiceCenterModal(false)}>
          <SafeAreaView style={styles.serviceCenterModalContainer}>
            <View style={styles.serviceCenterModalHeader}>
              <Text style={styles.serviceCenterModalTitle}>Service Center</Text>
              <TouchableOpacity
                onPress={() => setShowServiceCenterModal(false)}
                style={styles.serviceCenterModalCloseButton}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.serviceCenterModalScroll}
              contentContainerStyle={styles.serviceCenterModalContent}>
              <Card style={styles.serviceCenterCard}>
                <CardHeader>
                  <CardTitle>
                    <CardTitleText>Service Center Name</CardTitleText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text style={styles.serviceCenterName}>
                    {serviceCenter.name}
                  </Text>
                </CardContent>
              </Card>

              {serviceCenter.address && (
                <Card style={styles.serviceCenterCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Address</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.serviceCenterAddress}>
                      {serviceCenter.address}
                    </Text>
                  </CardContent>
                </Card>
              )}

              <Card style={styles.serviceCenterCard}>
                <CardHeader>
                  <CardTitle>
                    <CardTitleText>Last Assignment Update</CardTitleText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text style={styles.serviceCenterUpdateDate}>
                    {serviceCenterService.formatLastUpdate(serviceCenter.lastUpdated)}
                  </Text>
                </CardContent>
              </Card>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Service Center Update Notification */}
      {showServiceCenterUpdateNotification && (
        <View style={styles.serviceCenterNotificationOverlay}>
          <View style={styles.serviceCenterNotificationCard}>
            <View style={styles.serviceCenterNotificationIconContainer}>
              <Icon name="info" size={20} color={colors.primary} />
            </View>
            <View style={styles.serviceCenterNotificationContent}>
              <Text style={styles.serviceCenterNotificationTitle}>
                Service Center Updated
              </Text>
              <Text style={styles.serviceCenterNotificationSubtitle}>
                {updatedServiceCenterName}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Photo Gallery Modal */}
      {selectedOrderData && (
        <Modal
          visible={showPhotoGallery}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPhotoGallery(false)}>
          <SafeAreaView style={styles.photoGalleryModalContainer}>
            <View style={styles.photoGalleryModalHeader}>
              <Text style={styles.photoGalleryModalTitle}>
                Order Photos ({orderPhotos.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowPhotoGallery(false)}
                style={styles.photoGalleryModalCloseButton}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.photoGalleryScroll}
              contentContainerStyle={styles.photoGalleryContent}>
              {orderPhotos.length === 0 ? (
                <View style={styles.photoGalleryEmpty}>
                  <Icon name="camera-alt" size={64} color={colors.mutedForeground} />
                  <Text style={styles.photoGalleryEmptyText}>
                    No photos captured yet
                  </Text>
                  <Text style={styles.photoGalleryEmptySubtext}>
                    Use the camera button to capture photos
                  </Text>
                </View>
              ) : (
                orderPhotos.map((photo) => (
                  <Card key={photo.id} style={styles.photoCard}>
                    <CardContent>
                      <View style={styles.photoCardHeader}>
                        <View style={styles.photoCardInfo}>
                          <Text style={styles.photoCardCategory}>
                            {photoService.getCategoryLabel(photo.category)}
                          </Text>
                          <Text style={styles.photoCardTimestamp}>
                            {new Date(photo.timestamp).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.photoCardActions}>
                          <TouchableOpacity
                            style={styles.photoCardActionButton}
                            onPress={() =>
                              setPhotoNoteEdit({
                                photoId: photo.id,
                                caption: photo.caption ?? '',
                              })
                            }
                            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                            <Icon name="edit" size={18} color={colors.primary} />
                            <Text style={styles.photoCardActionText}>Edit note</Text>
                          </TouchableOpacity>
                          {(photo.caption ?? '').length > 0 && (
                            <TouchableOpacity
                              style={styles.photoCardActionButton}
                              onPress={() => {
                                const orderNumber = selectedOrderData?.orderNumber;
                                if (orderNumber) {
                                  setPhotoConfirm({
                                    type: 'deleteNote',
                                    orderNumber,
                                    photoId: photo.id,
                                  });
                                }
                              }}
                              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                              <Icon name="delete-outline" size={18} color={colors.destructive} />
                              <Text style={[styles.photoCardActionText, {color: colors.destructive}]}>
                                Delete note
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.photoCardActionButton}
                            onPress={() => {
                              const orderNumber = selectedOrderData?.orderNumber;
                              if (orderNumber) {
                                setPhotoConfirm({
                                  type: 'removePhoto',
                                  orderNumber,
                                  photoId: photo.id,
                                });
                              }
                            }}
                            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                            <Icon name="delete" size={18} color={colors.destructive} />
                            <Text style={[styles.photoCardActionText, {color: colors.destructive}]}>
                              Remove photo
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {photo.caption ? (
                        <View style={styles.photoCardCaptionRow}>
                          <Text style={styles.photoCardCaptionLabel}>Comment:</Text>
                          <Text style={styles.photoCardCaption}>{photo.caption}</Text>
                        </View>
                      ) : (
                        <View style={styles.photoCardCaptionRow}>
                          <Text style={styles.photoCardCaptionLabelMuted}>No comment</Text>
                        </View>
                      )}
                      {/* Note: In a real app, you'd display the actual image here */}
                      <View style={styles.photoPlaceholder}>
                        <Icon name="camera-alt" size={48} color={colors.mutedForeground} />
                        <Text style={styles.photoPlaceholderText}>Photo: {photo.uri}</Text>
                      </View>
                    </CardContent>
                  </Card>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Edit Photo Note Modal */}
      {photoNoteEdit && selectedOrderData && (
        <Modal
          visible={!!photoNoteEdit}
          transparent
          animationType="slide"
          onRequestClose={() => setPhotoNoteEdit(null)}>
          <View style={styles.editNoteModalOverlay}>
            <View style={styles.editNoteModalContainer}>
              <View style={styles.editNoteModalHeader}>
                <Text style={styles.editNoteModalTitle}>Edit comment</Text>
                <TouchableOpacity
                  onPress={() => setPhotoNoteEdit(null)}
                  style={styles.editNoteModalCloseButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.editNoteModalContent}>
                <Input
                  label="Comment"
                  placeholder="Add a note about this photo (optional)"
                  value={photoNoteEdit.caption}
                  onChangeText={(text) =>
                    setPhotoNoteEdit((prev) => (prev ? {...prev, caption: text} : null))
                  }
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.editNoteModalActions}>
                  <TouchableOpacity
                    style={styles.editNoteModalCancelButton}
                    onPress={() => setPhotoNoteEdit(null)}
                    activeOpacity={0.7}>
                    <Text style={styles.editNoteModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editNoteModalSaveButton}
                    onPress={() => {
                      photoService.updatePhoto(
                        selectedOrderData.orderNumber,
                        photoNoteEdit.photoId,
                        {caption: photoNoteEdit.caption.trim() || undefined},
                      );
                      setPhotoNoteEdit(null);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.editNoteModalSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete note / Remove photo confirmation modal */}
      {photoConfirm && (
        <Modal
          visible={!!photoConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoConfirm(null)}>
          <View style={styles.editNoteModalOverlay}>
            <View style={styles.editNoteModalContainer}>
              <View style={styles.editNoteModalHeader}>
                <Text style={styles.editNoteModalTitle}>
                  {photoConfirm.type === 'deleteNote' ? 'Delete note' : 'Remove photo'}
                </Text>
                <TouchableOpacity
                  onPress={() => setPhotoConfirm(null)}
                  style={styles.editNoteModalCloseButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.editNoteModalContent}>
                <Text style={styles.editNoteModalCancelText}>
                  {photoConfirm.type === 'deleteNote'
                    ? 'Remove the comment from this photo?'
                    : 'Delete this photo from the order?'}
                </Text>
                <View style={styles.editNoteModalActions}>
                  <TouchableOpacity
                    style={styles.editNoteModalCancelButton}
                    onPress={() => setPhotoConfirm(null)}
                    activeOpacity={0.7}>
                    <Text style={styles.editNoteModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editNoteModalSaveButton, {backgroundColor: colors.destructive}]}
                    onPress={async () => {
                      const {type, orderNumber, photoId} = photoConfirm;
                      setPhotoConfirm(null);
                      if (type === 'deleteNote') {
                        await photoService.updatePhoto(orderNumber, photoId, {caption: ''});
                      } else {
                        await photoService.deletePhoto(orderNumber, photoId);
                      }
                      setOrderPhotos([...photoService.getPhotosForOrder(orderNumber)]);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.editNoteModalSaveText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* P-Listed Authorization Modal */}
      {pListedAuthResult && (
        <Modal
          visible={showPListedAuthModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowPListedAuthModal(false);
            setPListedAuthResult(null);
            setPListedAuthAcknowledged(false);
            setPListedAuthCode('');
            setPListedAuthCodeValid(false);
          }}>
          <View style={styles.pListedAuthModalOverlay}>
            <View style={styles.pListedAuthModalContainer}>
              <View style={styles.pListedAuthModalHeader}>
                <View style={styles.pListedAuthModalTitleRow}>
                  <Icon name="warning" size={24} color={colors.warning} />
                  <Text style={styles.pListedAuthModalTitle}>
                    P-LISTED WASTE AUTHORIZATION REQUIRED
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowPListedAuthModal(false);
                    setPListedAuthResult(null);
                    setPListedAuthAcknowledged(false);
                    setPListedAuthCode('');
                    setPListedAuthCodeValid(false);
                  }}
                  style={styles.pListedAuthModalCloseButton}>
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.pListedAuthModalScroll}
                contentContainerStyle={styles.pListedAuthModalContent}>
                <Text style={styles.pListedAuthWarningText}>
                  One or more containers contain acute hazardous waste (P-Listed) requiring special authorization.
                </Text>

                <Card style={styles.pListedAuthCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>P-Listed Codes</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.pListedCodesContainer}>
                      {pListedAuthResult.pCodes.map((code: PListedCode) => (
                        <Badge
                          key={code}
                          variant="outline"
                          style={styles.pListedCodeBadge}>
                          {code}
                        </Badge>
                      ))}
                    </View>
                  </CardContent>
                </Card>

                <Card style={styles.pListedAuthCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Authorization Status</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.pListedAuthStatusRow}>
                      <View
                        style={[
                          styles.pListedAuthStatusIndicator,
                          pListedAuthResult.authorized
                            ? styles.pListedAuthStatusAuthorized
                            : styles.pListedAuthStatusNotAuthorized,
                        ]}>
                        <Icon
                          name={pListedAuthResult.authorized ? 'check-circle' : 'error'}
                          size={20}
                          color={
                            pListedAuthResult.authorized
                              ? colors.success
                              : colors.destructive
                          }
                        />
                        <Text
                          style={[
                            styles.pListedAuthStatusText,
                            pListedAuthResult.authorized
                              ? styles.pListedAuthStatusTextAuthorized
                              : styles.pListedAuthStatusTextNotAuthorized,
                          ]}>
                          {pListedAuthResult.authorized
                            ? 'Authorized'
                            : 'Not Authorized'}
                        </Text>
                      </View>
                    </View>

                    {pListedAuthResult.authorized && pListedAuthResult.authorization && (
                      <View style={styles.pListedAuthDetails}>
                        <View style={styles.pListedAuthDetailRow}>
                          <Text style={styles.pListedAuthDetailLabel}>
                            Authorization ID:
                          </Text>
                          <Text style={styles.pListedAuthDetailValue}>
                            {pListedAuthResult.authorization.id}
                          </Text>
                        </View>
                        <View style={styles.pListedAuthDetailRow}>
                          <Text style={styles.pListedAuthDetailLabel}>
                            Expiration Date:
                          </Text>
                          <Text style={styles.pListedAuthDetailValue}>
                            {new Date(
                              pListedAuthResult.authorization.expirationDate,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.pListedAuthDetailRow}>
                          <Text style={styles.pListedAuthDetailLabel}>
                            Authorized P-Codes:
                          </Text>
                          <View style={styles.pListedAuthCodesList}>
                            {pListedAuthResult.authorization.pCodes.map((code: PListedCode) => (
                              <Text
                                key={code}
                                style={styles.pListedAuthCodeItem}>
                                {code}
                              </Text>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}

                    {!pListedAuthResult.authorized && pListedAuthResult.failureReason && (
                      <View style={styles.pListedAuthError}>
                        <Text style={styles.pListedAuthErrorText}>
                          {pListedAuthResult.failureReason}
                        </Text>
                      </View>
                    )}
                  </CardContent>
                </Card>

                {/* Authorization Code Bypass */}
                <Card style={styles.pListedAuthCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Authorization Code (Optional)</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.pListedAuthCodeDescription}>
                      Enter an authorization code to proceed if you have been granted special authorization.
                    </Text>
                    <Input
                      placeholder="Enter authorization code"
                      value={pListedAuthCode}
                      onChangeText={(text) => {
                        setPListedAuthCode(text);
                        // Validate against dummy code (for simulation)
                        // In production, this would validate against backend
                        const isValid = text.trim().toUpperCase() === 'BYPASS2024';
                        setPListedAuthCodeValid(isValid);
                        if (isValid) {
                          // Auto-acknowledge when valid code is entered
                          setPListedAuthAcknowledged(true);
                        }
                      }}
                      containerStyle={styles.pListedAuthCodeInput}
                      secureTextEntry={false}
                    />
                    {!pListedAuthCodeValid && (
                      <Text style={styles.pListedAuthCodeHelpText}>
                        Test code: BYPASS2024
                      </Text>
                    )}
                    {pListedAuthCodeValid && (
                      <View style={styles.pListedAuthCodeValidIndicator}>
                        <Icon name="check-circle" size={16} color={colors.success} />
                        <Text style={styles.pListedAuthCodeValidText}>
                          Authorization code accepted
                        </Text>
                      </View>
                    )}
                  </CardContent>
                </Card>

                {pListedAuthResult.authorized && (
                  <View style={styles.pListedAuthAcknowledgment}>
                    <TouchableOpacity
                      style={styles.pListedAuthCheckbox}
                      onPress={() =>
                        setPListedAuthAcknowledged(!pListedAuthAcknowledged)
                      }
                      activeOpacity={0.7}
                      disabled={pListedAuthCodeValid}>
                      <View
                        style={[
                          styles.pListedAuthCheckboxBox,
                          (pListedAuthAcknowledged || pListedAuthCodeValid) &&
                            styles.pListedAuthCheckboxBoxChecked,
                        ]}>
                        {(pListedAuthAcknowledged || pListedAuthCodeValid) && (
                          <Icon
                            name="check"
                            size={16}
                            color={colors.primaryForeground}
                          />
                        )}
                      </View>
                      <Text style={styles.pListedAuthCheckboxText}>
                        I confirm I am authorized to handle this P-Listed waste
                        and will follow restricted waste protocols.
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={styles.pListedAuthModalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    setShowPListedAuthModal(false);
                    setPListedAuthResult(null);
                    setPListedAuthAcknowledged(false);
                    setPListedAuthCode('');
                    setPListedAuthCodeValid(false);
                  }}
                  style={styles.pListedAuthCancelButton}
                />
                {(pListedAuthResult.authorized || pListedAuthCodeValid) && (
                  <Button
                    title="Proceed to Manifest"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      // Clear modal state
                      setShowPListedAuthModal(false);
                      setPListedAuthResult(null);
                      setPListedAuthAcknowledged(false);
                      setPListedAuthCode('');
                      setPListedAuthCodeValid(false);
                      
                      // Proceed to manifest management
                      setCurrentStep('manifest-management');
                    }}
                    disabled={!pListedAuthAcknowledged && !pListedAuthCodeValid}
                    style={styles.pListedAuthProceedButton}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Service Type Selection Modal (FR-3a.UI.8.2) */}
      {pendingOrderForServiceTypeSelection && (
        <Modal
          visible={showServiceTypeSelectionModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowServiceTypeSelectionModal(false);
            setPendingOrderForServiceTypeSelection(null);
            setSelectedServiceTypeToStart(null);
            setNoShipReasonOrderNumber(null);
            setNoShipReasonServiceTypeId(null);
            setNoShipReasonCode('');
            setNoShipReasonNotes('');
          }}>
          <View style={styles.serviceTypeSelectionModalOverlay} pointerEvents="box-none">
            <View style={styles.serviceTypeSelectionModalContainer} pointerEvents="auto">
              <View style={styles.serviceTypeSelectionModalHeader}>
                <Text style={styles.serviceTypeSelectionModalTitle}>
                  Select Service to Start
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowServiceTypeSelectionModal(false);
                    setPendingOrderForServiceTypeSelection(null);
                    setSelectedServiceTypeToStart(null);
                    setNoShipReasonOrderNumber(null);
                    setNoShipReasonServiceTypeId(null);
                    setNoShipReasonCode('');
                    setNoShipReasonNotes('');
                  }}
                  style={styles.serviceTypeSelectionModalCloseButton}>
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.serviceTypeSelectionModalScroll}
                contentContainerStyle={styles.serviceTypeSelectionModalContent}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled">
                {pendingOrderForServiceTypeSelection.programs.map((serviceTypeId) => {
                  const order = pendingOrderForServiceTypeSelection;
                  const timeEntry = serviceTypeTimeEntries.get(serviceTypeId);
                  const hasStartTime = timeEntry != null && timeEntry.startTime != null;
                  const hasEndTime = timeEntry != null && timeEntry.endTime != null;
                  const isNoShip = isServiceTypeNoShip(order.orderNumber, serviceTypeId);
                  const isSelected = selectedServiceTypeToStart === serviceTypeId;
                  const isSelectable = !isNoShip && !(hasStartTime && hasEndTime);
                  const isInProgress = !isNoShip && hasStartTime && !hasEndTime;
                  const isCompleted = !isNoShip && hasStartTime && hasEndTime;
                  const isPending = !isNoShip && !hasStartTime;

                  const isChoosingReason = noShipReasonServiceTypeId === serviceTypeId;
                  const switchValue = isNoShip || isChoosingReason;

                  return (
                    <View
                      key={serviceTypeId}
                      style={[
                        styles.serviceTypeSelectionItem,
                        isPending && styles.serviceTypeSelectionItemPending,
                        isInProgress && styles.serviceTypeSelectionItemInProgress,
                        isCompleted && styles.serviceTypeSelectionItemCompleted,
                        isNoShip && styles.serviceTypeSelectionItemNoShip,
                        isSelected && styles.serviceTypeSelectionItemSelected,
                      ]}>
                      <View style={styles.serviceTypeSelectionItemContent}>
                        <TouchableOpacity
                          style={styles.serviceTypeSelectionItemLeft}
                          onPress={() => {
                            if (!isSelectable) return;
                            setSelectedServiceTypeToStart(serviceTypeId);
                          }}
                          activeOpacity={0.7}
                          disabled={!isSelectable}>
                          <Text
                            style={[
                              styles.serviceTypeSelectionItemName,
                              isPending && styles.serviceTypeSelectionItemNamePending,
                              isInProgress && styles.serviceTypeSelectionItemNameInProgress,
                              isCompleted && styles.serviceTypeSelectionItemNameCompleted,
                              isNoShip && styles.serviceTypeSelectionItemNameNoShip,
                            ]}>
                            {serviceTypeService.formatForOrderDetails(serviceTypeId)}
                          </Text>
                          {!isNoShip && timeEntry?.durationMinutes != null && (
                            <Badge variant="outline" style={styles.serviceTypeSelectionDurationBadge}>
                              {serviceTypeTimeService.formatDuration(timeEntry.durationMinutes)}
                            </Badge>
                          )}
                          {!isNoShip && activeServiceTypeTimer === serviceTypeId && (
                            <Badge variant="secondary" style={styles.serviceTypeSelectionActiveBadge}>
                              Active
                            </Badge>
                          )}
                          {!isNoShip && hasStartTime && hasEndTime && (
                            <Badge variant="default" style={styles.serviceTypeSelectionCompletedBadge}>
                              Completed
                            </Badge>
                          )}
                          {isNoShip && (
                            <Badge variant="outline" style={styles.serviceTypeSelectionNoShipBadge}>
                              No-Ship
                            </Badge>
                          )}
                        </TouchableOpacity>
                        <View style={styles.serviceTypeSelectionNoShipToggleWrap}>
                          <Text
                            style={styles.serviceTypeSelectionNoShipLabel}
                            numberOfLines={1}>
                            No-Ship
                          </Text>
                          <Switch
                            value={switchValue}
                            onValueChange={(value) => {
                              if (value) {
                                if (hasStartTime && !hasEndTime) {
                                  Alert.alert(
                                    'No-Ship After Service Started',
                                    'This service type has already been started. Do you want to mark it as No-Ship? You will need to provide a reason code.',
                                    [
                                      {text: 'Cancel', style: 'cancel'},
                                      {
                                        text: 'Mark as No-Ship',
                                        onPress: () => {
                                          setNoShipReasonOrderNumber(order.orderNumber);
                                          setNoShipReasonServiceTypeId(serviceTypeId);
                                          setNoShipReasonCode('');
                                          setNoShipReasonNotes('');
                                        },
                                      },
                                    ],
                                  );
                                  return;
                                }
                                setNoShipReasonOrderNumber(order.orderNumber);
                                setNoShipReasonServiceTypeId(serviceTypeId);
                                setNoShipReasonCode('');
                                setNoShipReasonNotes('');
                              } else {
                                if (isChoosingReason) {
                                  setNoShipReasonOrderNumber(null);
                                  setNoShipReasonServiceTypeId(null);
                                  setNoShipReasonCode('');
                                  setNoShipReasonNotes('');
                                } else {
                                  clearNoShipForServiceType(order.orderNumber, serviceTypeId);
                                  if (selectedServiceTypeToStart === serviceTypeId) {
                                    setSelectedServiceTypeToStart(null);
                                  }
                                }
                              }
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Inline No-Ship Reason (same modal, no modal-on-modal) */}
                {noShipReasonServiceTypeId != null &&
                  pendingOrderForServiceTypeSelection &&
                  noShipReasonOrderNumber === pendingOrderForServiceTypeSelection.orderNumber && (
                  <View style={styles.noShipReasonInlinePanel}>
                    <Text style={styles.noShipReasonInlineTitle}>
                      Select No-Ship Reason
                    </Text>
                    <Text style={styles.serviceTypeSelectionModalDescription}>
                      Required for audit and billing. Choose a reason code (Rule 52).
                    </Text>
                    <ScrollView
                      style={styles.noShipReasonInlineList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled>
                      {(Object.keys(NO_SHIP_REASON_CODES) as NoShipReasonCode[]).map(
                        code => (
                          <TouchableOpacity
                            key={code}
                            style={[
                              styles.noShipReasonRow,
                              noShipReasonCode === code &&
                                styles.noShipReasonRowSelected,
                            ]}
                            onPress={() => setNoShipReasonCode(code)}>
                            <Text style={styles.noShipReasonCode}>
                              {code}
                            </Text>
                            <Text style={styles.noShipReasonLabel}>
                              {getNoShipReasonLabel(code)}
                            </Text>
                          </TouchableOpacity>
                        ),
                      )}
                    </ScrollView>
                    {isOtherReason(noShipReasonCode) && (
                      <View style={styles.noShipReasonNotesSection}>
                        <Text style={styles.noShipReasonNotesLabel}>
                          Notes (required, min {MIN_OTHER_NOTES_LENGTH}{' '}
                          characters)
                        </Text>
                        <TextInput
                          style={styles.noShipReasonNotesInput}
                          value={noShipReasonNotes}
                          onChangeText={setNoShipReasonNotes}
                          placeholder="Enter reason details..."
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    )}
                    <View style={styles.noShipReasonInlineActions}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        onPress={() => {
                          setNoShipReasonOrderNumber(null);
                          setNoShipReasonServiceTypeId(null);
                          setNoShipReasonCode('');
                          setNoShipReasonNotes('');
                        }}
                      />
                      <Button
                        title="Confirm"
                        variant="primary"
                        disabled={
                          !noShipReasonCode ||
                          (isOtherReason(noShipReasonCode) &&
                            noShipReasonNotes.trim().length <
                              MIN_OTHER_NOTES_LENGTH)
                        }
                        onPress={() => {
                          if (
                            !noShipReasonOrderNumber ||
                            !noShipReasonServiceTypeId
                          )
                            return;
                          if (!noShipReasonCode) return;
                          if (
                            isOtherReason(noShipReasonCode) &&
                            noShipReasonNotes.trim().length <
                              MIN_OTHER_NOTES_LENGTH
                          ) {
                            return;
                          }
                          setNoShipForServiceType(
                            noShipReasonOrderNumber,
                            noShipReasonServiceTypeId,
                            {
                              reasonCode:
                                noShipReasonCode as NoShipReasonCode,
                              ...(isOtherReason(noShipReasonCode)
                                ? {notes: noShipReasonNotes.trim()}
                                : {}),
                            },
                          );
                          setNoShipReasonOrderNumber(null);
                          setNoShipReasonServiceTypeId(null);
                          setNoShipReasonCode('');
                          setNoShipReasonNotes('');
                        }}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>

              {pendingOrderForServiceTypeSelection &&
                pendingOrderForServiceTypeSelection.programs.every(p =>
                  isServiceTypeNoShip(
                    pendingOrderForServiceTypeSelection.orderNumber,
                    p,
                  ),
                ) && (
                  <View style={styles.serviceTypeSelectionModalAllNoShipBanner}>
                    <Text style={styles.serviceTypeSelectionModalAllNoShipText}>
                      All service types are No-Ship. Complete order as No-Ship (Rule 51).
                    </Text>
                  </View>
                )}

              <View style={styles.serviceTypeSelectionModalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowServiceTypeSelectionModal(false);
                    setPendingOrderForServiceTypeSelection(null);
                    setSelectedServiceTypeToStart(null);
                    setNoShipReasonOrderNumber(null);
                    setNoShipReasonServiceTypeId(null);
                    setNoShipReasonCode('');
                    setNoShipReasonNotes('');
                  }}
                />
                {pendingOrderForServiceTypeSelection &&
                pendingOrderForServiceTypeSelection.programs.every(p =>
                  isServiceTypeNoShip(
                    pendingOrderForServiceTypeSelection.orderNumber,
                    p,
                  ),
                ) ? (
                  <Button
                    title="Complete Order as No-Ship"
                    variant="primary"
                    onPress={() => {
                      const order = pendingOrderForServiceTypeSelection;
                      if (!order) return;
                      setCompletedOrders(prev =>
                        prev.includes(order.orderNumber)
                          ? prev
                          : [...prev, order.orderNumber],
                      );
                      setShowServiceTypeSelectionModal(false);
                      setPendingOrderForServiceTypeSelection(null);
                      setSelectedServiceTypeToStart(null);
                    }}
                  />
                ) : (
                  <Button
                    title="Start"
                    variant="primary"
                    disabled={
                      selectedServiceTypeToStart == null ||
                      isServiceTypeNoShip(
                        pendingOrderForServiceTypeSelection.orderNumber,
                        selectedServiceTypeToStart,
                      )
                    }
                    onPress={async () => {
                      const order = pendingOrderForServiceTypeSelection;
                      const stId = selectedServiceTypeToStart;
                      if (!order || !stId || !username) return;
                      if (isServiceTypeNoShip(order.orderNumber, stId)) return;

                    try {
                      const timeEntry = serviceTypeTimeService.getTimeEntry(
                        order.orderNumber,
                        stId,
                      );
                      const hasStart = timeEntry?.startTime != null;
                      const hasEnd = timeEntry?.endTime != null;

                      if (hasStart && !hasEnd) {
                        setActiveServiceTypeTimer(stId);
                        setShowServiceTypeSelectionModal(false);
                        setPendingOrderForServiceTypeSelection(null);
                        setSelectedServiceTypeToStart(null);
                        await proceedWithStartService(order);
                        return;
                      }
                      if (hasStart && hasEnd) {
                        Alert.alert(
                          'Service Type Already Completed',
                          'This service type has already been completed. Select another to start.',
                          [{text: 'OK'}],
                        );
                        return;
                      }

                      await serviceTypeTimeService.startServiceType(
                        order.orderNumber,
                        stId,
                        username,
                      );
                      setActiveServiceTypeTimer(stId);
                      const entries = new Map<string, ServiceTypeTimeEntry>();
                      order.programs.forEach(id => {
                        const e = serviceTypeTimeService.getTimeEntry(order.orderNumber, id);
                        if (e) entries.set(id, e);
                      });
                      setServiceTypeTimeEntries(entries);
                      setAddedContainers([]);
                      setMaterialsSupplies([]);
                      setEquipmentPPE([]);
                      setShowServiceTypeSelectionModal(false);
                      setPendingOrderForServiceTypeSelection(null);
                      setSelectedServiceTypeToStart(null);
                      await proceedWithStartService(order);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to start service type time tracking');
                    }
                  }}
                />
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Edit Modal */}
      {showTimeEditModal && editingServiceTypeId && editingTimeField && (
        <Modal
          visible={showTimeEditModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowTimeEditModal(false);
            setEditingServiceTypeId(null);
            setEditingTimeField(null);
          }}>
          <View style={styles.timeEditModalOverlay}>
            <View style={styles.timeEditModalContainer}>
              <View style={styles.timeEditModalHeader}>
                <Text style={styles.timeEditModalTitle}>
                  Edit {editingTimeField === 'start' ? 'Start' : 'End'} Time
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTimeEditModal(false);
                    setEditingServiceTypeId(null);
                    setEditingTimeField(null);
                  }}
                  style={styles.timeEditModalCloseButton}>
                  <Icon name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.timeEditModalContent}>
                <Text style={styles.timeEditModalDescription}>
                  {serviceTypeService.formatForOrderDetails(editingServiceTypeId)}
                </Text>

                <View style={styles.timeEditInputRow}>
                  <View style={styles.timeEditInputGroup}>
                    <Text style={styles.timeEditInputLabel}>Hour</Text>
                    <Input
                      value={editingTimeValue.hours}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 1 && num <= 12) {
                          setEditingTimeValue({...editingTimeValue, hours: text.padStart(2, '0')});
                        } else if (text === '') {
                          setEditingTimeValue({...editingTimeValue, hours: ''});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      containerStyle={styles.timeEditInput}
                    />
                  </View>
                  <Text style={styles.timeEditSeparator}>:</Text>
                  <View style={styles.timeEditInputGroup}>
                    <Text style={styles.timeEditInputLabel}>Minute</Text>
                    <Input
                      value={editingTimeValue.minutes}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 0 && num <= 59) {
                          setEditingTimeValue({...editingTimeValue, minutes: text.padStart(2, '0')});
                        } else if (text === '') {
                          setEditingTimeValue({...editingTimeValue, minutes: ''});
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      containerStyle={styles.timeEditInput}
                    />
                  </View>
                  <View style={styles.timeEditInputGroup}>
                    <Text style={styles.timeEditInputLabel}>AM/PM</Text>
                    <View style={styles.timeEditAmpmContainer}>
                      <TouchableOpacity
                        style={[
                          styles.timeEditAmpmButton,
                          editingTimeValue.ampm === 'AM' && styles.timeEditAmpmButtonActive,
                        ]}
                        onPress={() => setEditingTimeValue({...editingTimeValue, ampm: 'AM'})}>
                        <Text
                          style={[
                            styles.timeEditAmpmText,
                            editingTimeValue.ampm === 'AM' && styles.timeEditAmpmTextActive,
                          ]}>
                          AM
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.timeEditAmpmButton,
                          editingTimeValue.ampm === 'PM' && styles.timeEditAmpmButtonActive,
                        ]}
                        onPress={() => setEditingTimeValue({...editingTimeValue, ampm: 'PM'})}>
                        <Text
                          style={[
                            styles.timeEditAmpmText,
                            editingTimeValue.ampm === 'PM' && styles.timeEditAmpmTextActive,
                          ]}>
                          PM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.timeEditModalFooter}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="md"
                    onPress={() => {
                      setShowTimeEditModal(false);
                      setEditingServiceTypeId(null);
                      setEditingTimeField(null);
                    }}
                    style={styles.timeEditCancelButton}
                  />
                  <Button
                    title="Save"
                    variant="primary"
                    size="md"
                    onPress={async () => {
                      if (!selectedOrderData || !editingServiceTypeId || !editingTimeField || !username) return;
                      
                      // Convert time input to timestamp
                      const hours24 = editingTimeValue.ampm === 'PM' && parseInt(editingTimeValue.hours) !== 12
                        ? parseInt(editingTimeValue.hours) + 12
                        : editingTimeValue.ampm === 'AM' && parseInt(editingTimeValue.hours) === 12
                        ? 0
                        : parseInt(editingTimeValue.hours);
                      const minutes = parseInt(editingTimeValue.minutes);
                      
                      // Get order date (use serviceDate or current date)
                      const orderDate = selectedOrderData.serviceDate 
                        ? new Date(selectedOrderData.serviceDate) 
                        : new Date();
                      orderDate.setHours(hours24, minutes, 0, 0);
                      const timestamp = orderDate.getTime();
                      
                      // Validate time
                      const otherEntries = serviceTypeTimeService.getTimeEntriesForOrder(selectedOrderData.orderNumber)
                        .filter(e => e.serviceTypeId !== editingServiceTypeId);
                      const currentEntry = serviceTypeTimeEntries.get(editingServiceTypeId);
                      const startTime = editingTimeField === 'start' ? timestamp : (currentEntry?.startTime || null);
                      const endTime = editingTimeField === 'end' ? timestamp : (currentEntry?.endTime || null);
                      
                      const validation = serviceTypeTimeService.validateTimeEntry(
                        startTime,
                        endTime,
                        orderDate,
                        otherEntries,
                      );
                      
                      if (!validation.valid) {
                        Alert.alert('Validation Error', validation.errors.join('\n'));
                        return;
                      }
                      
                      if (validation.warnings.length > 0) {
                        Alert.alert('Warning', validation.warnings.join('\n'), [
                          {text: 'Cancel', style: 'cancel'},
                          {text: 'Continue', onPress: async () => {
                            try {
                              const updates: {startTime?: number | null; endTime?: number | null} = {};
                              if (editingTimeField === 'start') {
                                updates.startTime = timestamp;
                              } else {
                                updates.endTime = timestamp;
                              }
                              
                              const entry = await serviceTypeTimeService.updateTimeEntry(
                                selectedOrderData.orderNumber,
                                editingServiceTypeId,
                                updates,
                              );
                              
                              if (entry) {
                                const updated = new Map(serviceTypeTimeEntries);
                                updated.set(editingServiceTypeId, entry);
                                setServiceTypeTimeEntries(updated);
                              }
                              
                              setShowTimeEditModal(false);
                              setEditingServiceTypeId(null);
                              setEditingTimeField(null);
                            } catch (error) {
                              Alert.alert('Error', 'Failed to update time');
                            }
                          }},
                        ]);
                        return;
                      }
                      
                      // Save the time update
                      try {
                        const updates: {startTime?: number | null; endTime?: number | null} = {};
                        if (editingTimeField === 'start') {
                          updates.startTime = timestamp;
                        } else {
                          updates.endTime = timestamp;
                        }
                        
                        const entry = await serviceTypeTimeService.updateTimeEntry(
                          selectedOrderData.orderNumber,
                          editingServiceTypeId,
                          updates,
                        );
                        
                        if (entry) {
                          const updated = new Map(serviceTypeTimeEntries);
                          updated.set(editingServiceTypeId, entry);
                          setServiceTypeTimeEntries(updated);
                        }
                        
                        setShowTimeEditModal(false);
                        setEditingServiceTypeId(null);
                        setEditingTimeField(null);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update time');
                      }
                    }}
                    style={styles.timeEditSaveButton}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Record Drop Modal — FR-3a.EXT.3.1/3.2/3.3 */}
      <DropWasteModal
        visible={showDropWasteModal}
        onClose={() => setShowDropWasteModal(false)}
        onConfirm={handleRecordDrop}
        activeContainers={activeContainers.map(c => ({
          id: c.id,
          netWeight: c.netWeight,
          label: `${c.streamName} • ${c.containerSize} (${c.netWeight} lbs)`,
        }))}
        defaultTransferLocation={serviceCenter?.name ?? ''}
        transferLocationOptions={transferLocationOptions}
        serviceLocationAddress={dropModalServiceLocation.address}
        serviceLocationPhone={dropModalServiceLocation.phone}
        transferLocationDetails={transferLocationDetails}
      />
      
      {/* Add Material Modal - Full Screen for Tablets - At root level to prevent remounting */}
      <Modal
        visible={showAddMaterialModal}
        animationType="slide"
        onRequestClose={() => setShowAddMaterialModal(false)}>
        <View style={styles.fullScreenModalContainer}>
          <View style={styles.fullScreenModalHeader}>
            <Text style={styles.fullScreenModalTitle}>
              Add Material & Supply
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddMaterialModal(false);
                setSelectedMaterialItem(null);
                setMaterialQuantity('1');
                setMaterialType('used');
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
                <Text style={styles.sectionTitle}>Select Item</Text>
                <Text style={styles.sectionDescription}>
                  Choose a material or supply from the catalog
                </Text>
                <FlatList
                  style={styles.modalCatalogScroll}
                  contentContainerStyle={styles.modalCatalogContent}
                  data={MATERIALS_CATALOG}
                  keyExtractor={(item) => item.itemNumber}
                  keyboardShouldPersistTaps="handled"
                  removeClippedSubviews={false}
                  extraData={selectedMaterialItem?.itemNumber}
                  renderItem={({item}) => {
                    const isSelected = selectedMaterialItem?.itemNumber === item.itemNumber;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.materialCatalogItemVertical,
                          isSelected && styles.materialCatalogItemSelected,
                        ]}
                        onPress={() => setSelectedMaterialItem(item)}>
                        <Text
                          style={[
                            styles.materialCatalogItemNumber,
                            isSelected && styles.materialCatalogItemNumberSelected,
                          ]}>
                          {item.itemNumber}
                        </Text>
                        <Text
                          style={[
                            styles.materialCatalogItemDescription,
                            isSelected && styles.materialCatalogItemDescriptionSelected,
                          ]}>
                          {item.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {/* Right: Details Section (Always Visible) */}
              <View
                style={[
                  styles.modalDetailsPane,
                  isTablet() && styles.modalDetailsPaneTablet,
                ]}>
                <Text style={styles.sectionTitle}>Item Details</Text>
                <ScrollView
                  style={styles.modalDetailsScroll}
                  contentContainerStyle={styles.modalDetailsContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled">
                  {showAddMaterialSuccess && (
                    <View style={styles.addSuccessIndicator}>
                      <View style={styles.addSuccessRow}>
                        <Icon name="check-circle" size={18} color={colors.success} style={styles.addSuccessIcon} />
                        <Text style={styles.addSuccessText}>
                          Material added successfully!
                        </Text>
                      </View>
                    </View>
                  )}
                  {selectedMaterialItem ? (
                    <>
                      <View style={styles.selectedItemInfo}>
                        <Text style={styles.selectedItemNumber}>
                          {selectedMaterialItem.itemNumber}
                        </Text>
                        <Text style={styles.selectedItemDescription}>
                          {selectedMaterialItem.description}
                        </Text>
                      </View>

                      <View style={styles.materialInputSection}>
                        <Input
                          label="Quantity"
                          value={materialQuantity}
                          onChangeText={setMaterialQuantity}
                          keyboardType="numeric"
                          placeholder="1"
                        />
                      </View>

                      <View style={styles.materialInputSection}>
                        <Text style={styles.inputLabel}>Type</Text>
                        <Text style={styles.sectionDescription}>
                          Select whether this item was used or left behind
                        </Text>
                        <View style={styles.materialTypeCards}>
                          <TouchableOpacity
                            style={[
                              styles.materialTypeCard,
                              materialType === 'used' &&
                                styles.materialTypeCardSelected,
                            ]}
                            onPress={() => setMaterialType('used')}>
                            <Text
                              style={[
                                styles.materialTypeCardTitle,
                                materialType === 'used' &&
                                  styles.materialTypeCardTitleSelected,
                              ]}>
                              Used
                            </Text>

                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.materialTypeCard,
                              materialType === 'left_behind' &&
                                styles.materialTypeCardSelected,
                            ]}
                            onPress={() => setMaterialType('left_behind')}>
                            <Text
                              style={[
                                styles.materialTypeCardTitle,
                                materialType === 'left_behind' &&
                                  styles.materialTypeCardTitleSelected,
                              ]}>
                              Left Behind
                            </Text>

                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.noSelectionPlaceholder}>
                      <Text style={styles.noSelectionText}>
                        Select an item from the catalog to configure quantity
                        and type
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles.fullScreenModalFooter}>
            <Button
              title="Done"
              variant="outline"
              size="lg"
              onPress={() => {
                setShowAddMaterialModal(false);
                setSelectedMaterialItem(null);
                setMaterialQuantity('1');
                setMaterialType('used');
              }}
              style={styles.fullScreenModalCancelButton}
            />
            <Button
              title="Add Material"
              variant="primary"
              size="lg"
              disabled={!selectedMaterialItem}
              onPress={handleAddMaterial}
              style={styles.fullScreenModalAddButton}
            />
          </View>
        </View>
      </Modal>

      {/* Label Printing Notification */}
      {showLabelPrinting && (
        <View style={styles.labelPrintingOverlay}>
          <View style={styles.labelPrintingCard}>
            <View style={styles.labelPrintingIconContainer}>
              <Icon name="print" size={24} color={colors.foreground} />
              <View style={styles.labelPrintingSpinner} />
            </View>
            <View style={styles.labelPrintingContent}>
              <Text style={styles.labelPrintingTitle}>Printing Waste Label</Text>
              <Text style={styles.labelPrintingSubtitle}>
                Label: {printingLabelBarcode}
              </Text>
              <View style={styles.labelPrintingProgress}>
                <View style={styles.labelPrintingProgressBar} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Service Checklist Modal */}
      <Modal
        visible={showChecklistModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowChecklistModal(false)}>
        <ChecklistScreen
          checklist={sampleChecklist}
          onComplete={(answers) => {
            setChecklistAnswers(answers);
            setShowChecklistModal(false);
            console.log('[WasteCollection] Checklist completed:', answers);
          }}
          onCancel={() => {
            // Close modal directly - user can confirm if needed before opening
            setShowChecklistModal(false);
          }}
        />
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    display: 'flex',
    flexDirection: 'column',
    // @ts-ignore - web-specific style
    height: '100vh',
    // @ts-ignore - web-specific style
    overflow: 'hidden',
    // @ts-ignore - web-specific style
    position: 'relative',
  },
  appHeader: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appHeaderTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  appHeaderDot: {
    color: colors.primary,
  },
  appHeaderBanner: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  appHeaderBannerText: {
    ...typography.lg,
    color: colors.primaryForeground,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    display: 'flex',
    flexDirection: 'column',
    // @ts-ignore - web-specific style
    minHeight: 0,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    flex: 1,
  },
  headerContent: {

  },
  serviceCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  serviceCenterText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  offlineLimitMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning + '60',
    marginLeft: spacing.sm,
  },
  offlineLimitMessageWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning + '60',
    marginLeft: spacing.sm,
  },
  offlineLimitMessageOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: '#FF6B35' + '20',
    borderWidth: 1,
    borderColor: '#FF6B35' + '60',
    marginLeft: spacing.sm,
  },
  offlineLimitMessageCritical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.destructive + '20',
    borderWidth: 1,
    borderColor: colors.destructive + '60',
    marginLeft: spacing.sm,
  },
  offlineLimitMessageText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.foreground,
  },
  headerTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeTrackingBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeTrackingText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  syncStatusSynced: {
    backgroundColor: '#10b98120',
    borderColor: '#10b98180',
  },
  syncStatusSyncing: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f680',
  },
  syncStatusOffline: {
    backgroundColor: '#6b728020',
    borderColor: '#6b728080',
  },
  syncStatusPending: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b80',
  },
  syncStatusError: {
    backgroundColor: '#dc262620',
    borderColor: '#dc262680',
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  syncDotSynced: {
    backgroundColor: colors.success,
  },
  syncDotSyncing: {
    backgroundColor: colors.primary,
  },
  syncDotOffline: {
    backgroundColor: colors.mutedForeground,
  },
  syncDotPending: {
    backgroundColor: colors.warning,
  },
  syncDotError: {
    backgroundColor: colors.destructive,
  },
  syncText: {
    ...typography.sm,
    fontWeight: '500',
  },
  syncTextSynced: {
    color: colors.success,
  },
  syncTextSyncing: {
    color: colors.primary,
  },
  syncTextOffline: {
    color: colors.mutedForeground,
  },
  syncTextPending: {
    color: colors.warning,
  },
  syncTextError: {
    color: colors.destructive,
  },
  syncBadge: {
    marginLeft: spacing.xs,
  },
  pageTitle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    // @ts-ignore - web-specific style
    ...(isTablet() && {
      paddingHorizontal: spacing.md,
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  runningTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted + '30',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  runningTotalLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  runningTotalValue: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageTitleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // @ts-ignore - web-specific style
    flexWrap: 'nowrap',
  },
  pageTitleLogo: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.primary,
    // @ts-ignore - web-specific style
    whiteSpace: 'nowrap',
  },
  pageTitleText: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
    // @ts-ignore - web-specific style
    whiteSpace: 'nowrap',
    flex: 0,
  },
  allNotesEmptyText: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  allNotesOrderSection: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allNotesOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  allNotesOrderNumber: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  allNotesOrderMeta: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  scrollViewContainer: {
    flex: 1,
    overflow: 'hidden',
    // @ts-ignore - web-specific style
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    // @ts-ignore - web-specific style
    overflowY: 'auto',
    // @ts-ignore - web-specific style
    WebkitOverflowScrolling: 'touch',
  },
  scrollContent: {
    padding: spacing.lg,
    // @ts-ignore - web-specific style
    flexGrow: 1,
  },
  scrollContentTablet: {
    // @ts-ignore - web-specific style
    paddingLeft: spacing.md,
    // @ts-ignore - web-specific style
    paddingRight: spacing.md,
    // @ts-ignore - web-specific style
    maxWidth: 1200,
    // @ts-ignore - web-specific style
    alignSelf: 'center',
    // @ts-ignore - web-specific style
    width: '100%',
  },
  ordersCount: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  completedOrdersCount: {
    ...typography.base,
    color: colors.success,
    fontWeight: '500',
  },
  // Completed Orders Section Styles
  completedOrdersSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  completedOrdersHeader: {
    marginBottom: spacing.md,
  },
  completedOrdersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedOrdersIcon: {
    marginRight: spacing.xs / 2,
  },
  completedOrdersTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.success,
  },
  completedOrderCard: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    opacity: 0.8,
  },
  completedOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedOrderLeft: {
    flex: 1,
  },
  completedOrderNumber: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  completedOrderCustomer: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  completedOrderRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCardTablet: {
    // @ts-ignore - web-specific style
    paddingLeft: spacing.md,
    // @ts-ignore - web-specific style
    paddingRight: spacing.md,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  orderNumber: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  orderCardBody: {
    gap: spacing.xs,
  },
  customerName: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  siteInfo: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  serviceDate: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  programsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  programsContainerInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  programsDetailRow: {
    alignItems: 'flex-start',
  },
  programBadgeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  programBadge: {
    marginBottom: spacing.xs / 2,
  },
  programBadgePending: {
    backgroundColor: colors.warning + '22',
    borderColor: colors.warning,
  },
  programBadgeInProgress: {
    backgroundColor: colors.info + '22',
    borderColor: colors.info,
  },
  programBadgeNoship: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  programBadgeCompleted: {
    backgroundColor: colors.success + '22',
    borderColor: colors.success,
  },
  programBadgeTextPending: {
    color: colors.warning,
  },
  programBadgeTextInProgress: {
    color: colors.info,
  },
  programBadgeTextNoship: {
    color: colors.mutedForeground,
  },
  programBadgeTextCompleted: {
    color: colors.success,
  },
  serviceOrderNumber: {
    ...typography.xs,
    color: colors.mutedForeground,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    minHeight: touchTargets.comfortable + spacing.md * 2,
  },
  backButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    ...typography.xl,
    color: colors.foreground,
  },
  screenHeaderContent: {
    flex: 1,
  },
  screenHeaderTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  screenHeaderSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  searchInput: {
    marginBottom: spacing.lg,
  },
  streamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  streamCard: {
    width: cardWidth,
    minWidth: Math.max(200, cardWidth),
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 200,
  },
  streamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  streamCardBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recentlyUsedBadge: {
    // Transparent background (handled by outline variant)
  },
  recentlyUsedBadgeText: {
    color: colors.mutedForeground,
  },
  streamCardTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  streamCardProfileNumber: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  streamCardDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  categoryBadgeGreen: {
    backgroundColor: 'rgba(5, 150, 105, 0.3)', // colors.success with 50% opacity
  },
  categoryBadgeYellow: {
    backgroundColor: 'rgba(217, 119, 6, 0.3)', // colors.warning with 50% opacity
  },
  categoryBadgeBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)', // colors.info with 50% opacity
  },
  categoryBadgeRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)', // colors.destructive with 50% opacity
  },
  categoryBadgeTextWhite: {
    color: colors.foreground, // Black text for better contrast with transparent backgrounds
  },
  streamCardCategory: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  streamCardHazard: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  streamCardWasteCode: {
    marginTop: spacing.xs,
  },
  containersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  containerCard: {
    width: cardWidth,
    minWidth: Math.max(200, cardWidth),
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 220,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  containerCardCode: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  containerCardTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  containerCardInfo: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  weightInputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  weightInput: {
    flex: 1,
  },
  netWeightCard: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  netWeightLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  netWeightValue: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  warningCard: {
    backgroundColor: '#f59e0b20',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#f59e0b80',
    marginTop: spacing.md,
  },
  hardWarningCard: {
    backgroundColor: '#dc262620',
    borderWidth: 2,
    borderColor: colors.destructive,
  },
  warningTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  hardWarningTitle: {
    color: colors.destructive,
  },
  warningText: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  cylinderCountCard: {
    marginBottom: spacing.md,
  },
  manualEntryIndicator: {
    backgroundColor: '#fef3c720',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  // Consolidated Weight Display Styles
  netWeightDisplayCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  netWeightDisplayCardSoftWarning: {
    backgroundColor: '#fef3c720',
    borderColor: colors.warning,
    borderWidth: 4,
  },
  netWeightDisplayCardHardWarning: {
    backgroundColor: '#dc262620',
    borderColor: colors.destructive,
    borderWidth: 4,
  },
  netWeightDisplayLabel: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  netWeightDisplayValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  netWeightDisplayLargeValue: {
    ...typography['3xl'],
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontSize: 48,
    lineHeight: 56,
  },
  netWeightDisplayLargeValueWarning: {
    color: colors.destructive,
  },
  netWeightDisplayUnit: {
    ...typography.xl,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  inlineWarningSoft: {
    backgroundColor: colors.warning + '30',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    width: '100%',
  },
  inlineWarningHard: {
    backgroundColor: colors.destructive + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.destructive,
    width: '100%',
  },
  inlineWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineWarningIcon: {
    marginRight: spacing.xs / 2,
  },
  inlineWarningText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    flex: 1,
  },
  compactWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  compactWeightItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactWeightDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  compactWeightLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  compactWeightValue: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  compactWeightValueOffline: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.mutedForeground,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  compactWeightValueNet: {
    color: colors.primary,
  },
  compactWeightUnit: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  compactScaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  compactScaleStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactScaleLight: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  compactScaleLightOnline: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 2,
  },
  compactScaleLightOffline: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  compactScaleInputContainer: {
    marginTop: spacing.xs,
    marginBottom: 0,
  },
  compactScaleInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    paddingVertical: spacing.xs,
  },
  manualEntryText: {
    ...typography.sm,
    color: '#92400e',
    textAlign: 'center',
  },
  manualWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  manualWeightIcon: {
    marginRight: spacing.xs / 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  summaryText: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  cardDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  containerSummaryCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    minHeight: touchTargets.comfortable * 2, // Ensure swipe target
  },
  // Condensed Header
  containerSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  containerSummaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  containerSummaryNumber: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 32,
  },
  containerSummaryTitleGroup: {
    flex: 1,
  },
  containerSummaryTitle: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  containerSummarySubtitle: {
    ...typography.xs,
    color: colors.mutedForeground,
  },
  containerSummaryNetWeight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  containerSummaryNetWeightLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 13,
  },
  containerSummaryNetWeightValue: {
    ...typography.base,
    fontWeight: '700',
  },
  // Condensed Body
  containerSummaryBody: {
    gap: spacing.sm,
  },
  containerSummaryInfoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 0,
  },
  containerSummaryInfoCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  containerSummaryInfoLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    fontSize: 13,
  },
  containerSummaryInfoValue: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 0,
  },
  containerSummaryInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  reprintButtonInline: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: touchTargets.min,
    alignSelf: 'flex-end',
  },
  containerSummaryWeightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minHeight: touchTargets.comfortable,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerSummaryWeightSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSummaryWeightSectionNet: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  containerSummaryWeightDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  containerSummaryWeightLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    fontSize: 13,
  },
  containerSummaryWeightLabelNet: {
    color: colors.primary,
  },
  containerSummaryWeightValue: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  containerSummaryWeightValueNet: {
    ...typography.lg,
    color: colors.primary,
  },
  netWeightHighlight: {
    color: colors.primary,
  },
  // Manifest Configuration Styles
  manifestSummarySection: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  manifestSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  manifestSummaryItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  manifestSummaryLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manifestSummaryValue: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  manifestSummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  manifestShipmentCard: {
    marginBottom: spacing.xl,
  },
  manifestShipmentSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  programsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  programSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  programNameContainer: {
    flex: 1,
  },
  programName: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
    flex: 1,
  },
  serviceTypeRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  serviceTypeRowHeader: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  serviceTypeRowHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTypeRowHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  serviceTypeDurationBadge: {
    borderColor: colors.primary,
  },
  serviceTypeActiveBadge: {
    backgroundColor: colors.success + '20',
  },
  expandIcon: {
    marginLeft: spacing.sm,
  },
  serviceTypeTimeSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceTypeTimeActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  serviceTypeTimeButton: {
    flex: 1,
  },
  serviceTypeTimeFields: {
    gap: spacing.sm,
  },
  serviceTypeTimeField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  serviceTypeTimeLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  serviceTypeTimeValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  serviceTypeTimeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceTypeSelectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  serviceTypeSelectionModalContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    maxWidth: 600,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  serviceTypeSelectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceTypeSelectionModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  serviceTypeSelectionModalCloseButton: {
    padding: spacing.xs,
  },
  serviceTypeSelectionModalScroll: {
    maxHeight: 400,
  },
  serviceTypeSelectionModalContent: {
    padding: spacing.lg,
  },
  serviceTypeSelectionModalDescription: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  noShipReasonInlinePanel: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noShipReasonInlineTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  noShipReasonInlineList: {
    maxHeight: 220,
    marginVertical: spacing.sm,
  },
  noShipReasonInlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  noShipReasonList: {
    maxHeight: 280,
    marginVertical: spacing.md,
  },
  noShipReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  noShipReasonRowSelected: {
    backgroundColor: colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  noShipReasonCode: {
    ...typography.sm,
    fontWeight: '700',
    color: colors.foreground,
    minWidth: 56,
  },
  noShipReasonLabel: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  noShipReasonNotesSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  noShipReasonNotesLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  noShipReasonNotesInput: {
    ...typography.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.inputBackground,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  serviceTypeSelectionItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  /** Pending / not started = orange */
  serviceTypeSelectionItemPending: {
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning,
  },
  /** In progress = blue */
  serviceTypeSelectionItemInProgress: {
    backgroundColor: colors.info + '18',
    borderColor: colors.info,
  },
  /** Completed = green */
  serviceTypeSelectionItemCompleted: {
    backgroundColor: colors.success + '18',
    borderColor: colors.success,
  },
  serviceTypeSelectionItemActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '10',
  },
  /** No-ship = grey */
  serviceTypeSelectionItemNoShip: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    opacity: 0.9,
  },
  serviceTypeSelectionItemSelected: {
    borderWidth: 2,
  },
  serviceTypeSelectionItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTypeSelectionItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  serviceTypeSelectionNoShipToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceTypeSelectionNoShipLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  serviceTypeSelectionItemName: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  serviceTypeSelectionItemNamePending: {
    color: colors.warning,
  },
  serviceTypeSelectionItemNameInProgress: {
    color: colors.info,
  },
  serviceTypeSelectionItemNameCompleted: {
    color: colors.success,
  },
  serviceTypeSelectionItemNameNoShip: {
    color: colors.mutedForeground,
  },
  serviceTypeSelectionNoShipBadge: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  serviceTypeSelectionModalAllNoShipBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceTypeSelectionModalAllNoShipText: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  serviceTypeSelectionModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceTypeSelectionDurationBadge: {
    borderColor: colors.primary,
  },
  serviceTypeSelectionActiveBadge: {
    // Use Badge's default secondary variant styling
  },
  serviceTypeSelectionCompletedBadge: {
    // Use Badge's default variant styling
  },
  timeEditModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  timeEditModalContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  timeEditModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeEditModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  timeEditModalCloseButton: {
    padding: spacing.xs,
  },
  timeEditModalContent: {
    padding: spacing.lg,
  },
  timeEditModalDescription: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  timeEditInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  timeEditInputGroup: {
    alignItems: 'center',
  },
  timeEditInputLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  timeEditInput: {
    width: 80,
  },
  timeEditSeparator: {
    ...typography['2xl'],
    color: colors.foreground,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  timeEditAmpmContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timeEditAmpmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  timeEditAmpmButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeEditAmpmText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  timeEditAmpmTextActive: {
    color: colors.primaryForeground,
  },
  timeEditModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeEditCancelButton: {
    flex: 1,
  },
  timeEditSaveButton: {
    flex: 1,
  },
  programToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  programStatusLabel: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  summaryCard: {
    marginTop: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    ...typography.base,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  summaryValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  materialsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  materialItem: {
    ...typography.base,
    color: colors.foreground,
    paddingLeft: spacing.md,
  },
  // Materials & Supplies Table Styles
  materialsTable: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  materialsTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  materialsTableHeaderText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  materialsTableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  materialsTableCell: {
    flex: 1,
    ...typography.sm,
    color: colors.foreground,
  },
  materialsTableCellDescription: {
    flex: 2,
  },
  materialsTableQuantity: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  quantityEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quantityEditInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 50,
    ...typography.base,
    color: colors.foreground,
  },
  quantityEditButton: {
    padding: spacing.xs,
  },
  quantityEditButtonText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteMaterialButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteMaterialButtonText: {
    ...typography.sm,
    color: colors.destructive,
    fontWeight: '600',
  },
  emptyMaterialsState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
  },
  emptyMaterialsText: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  emptyMaterialsSubtext: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  addMaterialButton: {
    marginTop: spacing.lg,
  },
  // Full Screen Modal Styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  fullScreenModalTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  fullScreenModalCloseButton: {
    padding: spacing.sm,
  },
  fullScreenModalCloseText: {
    ...typography.xl,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  fullScreenModalBody: {
    flex: 1,
  },
  fullScreenModalContent: {
    padding: spacing.lg,
  },
  // Split Layout Styles for Modal
  modalSplitContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  modalSplitContainerRow: {
    flexDirection: 'row',
  },
  modalSplitContainerColumn: {
    flexDirection: 'column',
  },
  modalCatalogPane: {
    flex: 1,
    minHeight: 300,
  },
  modalCatalogPaneTablet: {
    flex: 1,
    minHeight: undefined,
  },
  modalCatalogScroll: {
    flex: 1,
  },
  modalCatalogContent: {
    paddingBottom: spacing.md,
  },
  modalDetailsPane: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 300,
  },
  modalDetailsPaneTablet: {
    flex: 1,
    minHeight: undefined,
  },
  modalDetailsScroll: {
    flex: 1,
  },
  modalDetailsContent: {
    paddingBottom: spacing.md,
  },
  selectedItemInfo: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedItemNumber: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  selectedItemDescription: {
    ...typography.base,
    color: colors.foreground,
  },
  noSelectionPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noSelectionText: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputLabel: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  addSuccessIndicator: {
    backgroundColor: `${colors.success || colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.success || colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  successMessageIcon: {
    marginRight: spacing.xs / 2,
  },
  addSuccessText: {
    ...typography.base,
    color: colors.success || colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  addSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  addSuccessIcon: {
    marginRight: spacing.xs / 2,
  },
  fullScreenModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  fullScreenModalCancelButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
  },
  fullScreenModalAddButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
  },
  materialSelectionSection: {
    marginBottom: spacing.xl,
  },
  materialCatalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  materialCatalogItem: {
    width: '48%',
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    minHeight: 100,
    justifyContent: 'center',
  },
  materialCatalogItemVertical: {
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
    minHeight: 60,
    justifyContent: 'center',
  },
  materialCatalogItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  materialCatalogItemNumber: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  materialCatalogItemNumberSelected: {
    color: colors.primary,
  },
  materialCatalogItemDescription: {
    ...typography.base,
    color: colors.foreground,
  },
  materialCatalogItemDescriptionSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  materialDetailsSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  materialInputSection: {
    // marginBottom: spacing.lg,
  },
  materialTypeCards: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  materialTypeCard: {
    flex: 1,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    minHeight: 70,
    justifyContent: 'center',
  },
  materialTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  materialTypeCardTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  materialTypeCardTitleSelected: {
    color: colors.primary,
  },
  materialTypeCardDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  materialTypeCardDescriptionSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  // Equipment & PPE Styles
  equipmentList: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  equipmentCountContainer: {
    minWidth: 60,
    alignItems: 'center',
  },
  equipmentCount: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteEquipmentButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  deleteEquipmentButtonText: {
    ...typography.sm,
    color: colors.destructive,
    fontWeight: '600',
  },
  equipmentCatalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  equipmentCatalogItem: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    minWidth: 120,
  },
  equipmentCatalogItemText: {
    ...typography.base,
    color: colors.foreground,
    textAlign: 'center',
  },
  // Print Summary Styles
  printSummaryCard: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  printSummarySection: {
    marginBottom: spacing.lg,
  },
  printSummarySectionTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  printSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  printSummaryLabel: {
    ...typography.base,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  printSummaryValue: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  printSummaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  printSummaryItem: {
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
  },
  printSummaryItemText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  printSummaryItemSubtext: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
    paddingLeft: spacing.md,
  },
  customerInput: {
    marginBottom: spacing.md,
  },
  // Master-Detail Layout Styles
  masterDetailContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  masterPane: {
    minWidth: 280,
    maxWidth: 480,
    backgroundColor: colors.card,
    borderRightWidth: 2,
    borderRightColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
  },
  masterPaneHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  masterPaneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  masterPaneTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  masterPaneSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  masterPaneScroll: {
    flex: 1,
  },
  masterPaneContent: {
    padding: spacing.md,
  },
  masterOrderItem: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  masterOrderItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  masterOrderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  masterOrderNumber: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  masterOrderNumberSelected: {
    color: colors.primary,
  },
  masterOrderBadge: {
    marginLeft: spacing.sm,
  },
  masterOrderCustomer: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  masterOrderSite: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  masterOrderTime: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  masterOrderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  masterOrderMetaBadge: {
    marginRight: spacing.xs,
  },
  detailPane: {
    flex: 1,
    backgroundColor: colors.background,
    display: 'flex',
    flexDirection: 'column',
  },
  detailPaneScroll: {
    flex: 1,
  },
  detailPaneContent: {
    padding: spacing.lg,
  },
  detailPaneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  detailPaneTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  contactCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary + '08', // Light tint to make it prominent
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    ...typography.base,
    color: colors.mutedForeground,
    fontWeight: '500',
    flex: 1,
  },
  contactValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  contactLink: {
    ...typography.base,
    color: colors.primary,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  noContactContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  noContactText: {
    ...typography.base,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  viewAllContactsButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  viewAllContactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllContactsText: {
    ...typography.sm,
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  detailNotesSection: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  detailNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailNotesTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  detailNotesBadge: {
    backgroundColor: colors.primary,
  },
  detailNotesEmptyText: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.base,
    color: colors.mutedForeground,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  detailValueContainer: {
    flex: 2,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  storeNumber: {
    ...typography.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  detailActions: {
    marginTop: spacing.lg,
  },
  detailPaneEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  detailPaneEmptyTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  detailPaneEmptyText: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  // Swipe-to-Delete Styles (Android Material Design)
  swipeDeleteContainer: {
    flex: 1,
    backgroundColor: colors.destructive,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  swipeDeleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    minHeight: touchTargets.comfortable,
  },
  swipeDeleteText: {
    ...typography.base,
    color: colors.destructiveForeground,
    fontWeight: '600',
  },
  // Bottom Sheet Styles (Tablet-Optimized for ergonomic reach)
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  bottomSheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    // @ts-ignore - web-specific style
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    elevation: 16,
    maxHeight: '90%',
    width: '100%',
    flexDirection: 'column',
  },
  bottomSheetContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    // @ts-ignore - web-specific style
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    elevation: 16,
    maxHeight: 500,
    width: '100%',
  },
  bottomSheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bottomSheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bottomSheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bottomSheetTitleIcon: {
    marginRight: spacing.xs / 2,
  },
  bottomSheetTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  bottomSheetSubtitle: {
    ...typography.base,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  bottomSheetBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flex: 1,
    gap: spacing.md,
  },
  bottomSheetBodyScroll: {
    flex: 1,
  },
  bottomSheetBodyContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  bottomSheetMessage: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  bottomSheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomSheetCancelButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
  },
  bottomSheetCancelText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.secondaryForeground,
  },
  // Bottom Sheet Option Buttons (for action menus)
  bottomSheetOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    minHeight: touchTargets.large,
    gap: spacing.md,
  },
  bottomSheetOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetOptionIconText: {
    fontSize: 28,
  },
  bottomSheetOptionInfo: {
    flex: 1,
  },
  bottomSheetOptionLabel: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  bottomSheetOptionDesc: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bottomSheetOptionArrow: {
    fontSize: 24,
    color: colors.mutedForeground,
  },
  bottomSheetDeleteButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
  },
  // Tablet-specific bottom sheet styles
  bottomSheetOverlayTablet: {
    alignItems: 'center',
  },
  bottomSheetContentTablet: {
    width: 500,
    maxWidth: 600,
    maxHeight: 300,
  },
  bottomSheetContentLarge: {
    maxHeight: '80%',
  },
  // Manifest styles
  trackingNumber: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.primary,
  },
  manifestActionsInCard: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manifestActionsLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  manifestActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  manifestActionButton: {
    flex: 1,
    minWidth: 120,
  },
  scannedImageIndicator: {
    backgroundColor: '#10b98120',
    borderRadius: borderRadius.md,
  },
  // Quick Actions Bar Styles (Bottom Bar - optimized for tablet ergonomics)
  quickActionsBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.large + spacing.md * 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  quickActionHomeButton: {
    width: touchTargets.large,
    height: touchTargets.large,
    backgroundColor: colors.background,
        borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionHomeIcon: {
    fontSize: 28,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTargets.comfortable,
    position: 'relative',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  quickActionLabel: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  quickActionBadge: {
    position: 'absolute',
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    zIndex: 1,
  },
  quickActionBadgeText: {
    ...typography.base,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  quickActionButtonTablet: {
    // maxWidth: 200,
  },
  manifestSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manifestSuccessIcon: {
    marginRight: spacing.xs / 2,
  },
  scannedImageText: {
    ...typography.sm,
    color: '#059669',
    textAlign: 'center',
  },
  printOptionButton: {
    width: '100%',
  },
  // Print preview styles
  previewLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  previewSubValue: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  previewContainerItem: {
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  // EPA Manifest Form Preview Styles
  manifestPreviewContainer: {
    flex: 1,
    backgroundColor: '#E5E5E5',
  },
  manifestPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  manifestPreviewHeaderTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manifestPreviewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manifestPreviewCloseBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  manifestPreviewScroll: {
    flex: 1,
    padding: spacing.md,
  },
  manifestPreviewFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  epaFormContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: spacing.lg,
  },
  epaFormHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  epaFormHeaderLeft: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  epaFormHeaderCenter: {
    flex: 1.5,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    alignItems: 'center',
  },
  epaFormHeaderRight: {
    width: 100,
    padding: 8,
    alignItems: 'center',
  },
  epaFormSmallText: {
    fontSize: 8,
    color: '#000000',
  },
  epaFormTitleBox: {
    marginTop: 4,
  },
  epaFormTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  epaFormBarcodeBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  epaFormBarcodeText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#000000',
  },
  epaFormManifestNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  epaFormProviderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  epaFormPageBox: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  epaFormPageNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  epaFormRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  epaFormCell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  epaFormCellLabel: {
    fontSize: 8,
    color: '#000000',
    marginBottom: 2,
  },
  epaFormCellLabelSmall: {
    fontSize: 7,
    color: '#000000',
  },
  epaFormCellValue: {
    fontSize: 9,
    color: '#000000',
  },
  epaFormCellValueBold: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
  },
  epaFormCellValueLarge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  epaFormCellValueSmall: {
    fontSize: 7,
    color: '#000000',
    lineHeight: 10,
  },
  epaFormSectionHeader: {
    backgroundColor: '#FFD700',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  epaFormSectionHeaderText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#000000',
    transform: [{rotate: '-90deg'}],
    width: 80,
    position: 'absolute',
    left: -30,
    top: 35,
  },
  epaWasteTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  epaWasteTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 40,
  },
  epaWasteTableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  epaSignatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  epaSignatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    height: 20,
  },
  epaSignatureImage: {
    height: 40,
    width: '100%',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: borderRadius.sm,
  } as ImageStyle,
  signatureModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  signatureModalTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  signatureModalCloseBtn: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureModalCloseBtnText: {
    ...typography.xl,
    color: colors.foreground,
    fontWeight: '600',
  },
  signatureCanvasContainer: {
    flex: 1,
    margin: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  epaDateBox: {
    width: 80,
  },
  epaDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  epaDateValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  epaFormFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  epaFormFooterText: {
    fontSize: 7,
    color: '#000000',
  },
  epaFormFooterHighlight: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FF6600',
  },
  // Service Summary Styles (matching print layout)
  serviceSummaryContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginBottom: spacing.lg,
  },
  serviceSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  serviceSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  serviceSummaryLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceSummaryLogoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E5339',
  },
  serviceSummaryLogoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CB342',
    marginLeft: 2,
  },
  serviceSummaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  serviceSummaryTopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceSummaryFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  serviceSummaryFieldValue: {
    fontSize: 14,
    color: '#333333',
  },
  serviceSummaryTwoColumn: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  serviceSummaryColumnBox: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#CCCCCC',
  },
  serviceSummarySectionHeader: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  serviceSummarySectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  serviceSummarySectionBody: {
    padding: spacing.md,
  },
  serviceSummaryText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  serviceSummaryFieldRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  serviceSummarySection: {
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  serviceSummaryTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  serviceSummaryTableCell: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    justifyContent: 'center',
  },
  serviceSummaryTableHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  serviceSummaryTableValue: {
    fontSize: 13,
    color: '#333333',
  },
  serviceSummaryTimeRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  serviceSummaryTimeServiceType: {
    flex: 1,
    paddingRight: spacing.md,
  },
  serviceSummaryTimeServiceTypeName: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  serviceSummaryTimeDetails: {
    flex: 2,
  },
  serviceSummaryTimeText: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  serviceSummaryTimeTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  serviceSummaryTimeTotalLabel: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '600',
  },
  serviceSummaryTimeTotalValue: {
    ...typography.base,
    color: colors.primary,
    fontWeight: '700',
  },
  serviceSummaryAcknowledgement: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    alignItems: 'flex-start',
  },
  serviceSummaryAckLeft: {
    width: 100,
  },
  serviceSummaryAckTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  serviceSummaryAckMiddle: {
    flex: 1,
    gap: spacing.sm,
  },
  serviceSummaryAckRight: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: spacing.lg,
  },
  serviceSummaryAckField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  serviceSummaryAckLabel: {
    fontSize: 14,
    color: '#666666',
    width: 85,
  },
  serviceSummaryAckInputLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
    minWidth: 100,
  },
  serviceSummaryAckValue: {
    fontSize: 14,
    color: '#333333',
  },
  serviceSummaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#F5F5F5',
  },
  serviceSummaryFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceSummaryFooterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  serviceSummaryFooterValue: {
    fontSize: 13,
    color: '#333333',
    backgroundColor: '#FFFFCC',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  serviceSummaryFooterValueMuted: {
    fontSize: 13,
    color: '#CC6600',
    fontStyle: 'italic',
  },
  // Label Printing Notification Styles
  labelPrintingOverlay: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    zIndex: 1000,
  },
  labelPrintingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingRight: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 280,
  },
  labelPrintingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  labelPrintingSpinner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: colors.primary,
    // Note: Animation would need Animated API for rotation
  },
  labelPrintingContent: {
    flex: 1,
  },
  labelPrintingTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  labelPrintingSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  labelPrintingProgress: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  labelPrintingProgressBar: {
    height: '100%',
    width: '70%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  // Incomplete Warning Card Styles
  incompleteWarningCard: {
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  incompleteWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incompleteWarningIcon: {
    fontSize: 20,
  },
  incompleteWarningTitleText: {
    ...typography.lg,
    fontWeight: '600',
    color: '#B45309',
  },
  incompleteWarningDescription: {
    ...typography.sm,
    color: '#92400E',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  incompleteReasonsList: {
    gap: spacing.sm,
  },
  incompleteReasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  incompleteReasonError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  incompleteReasonWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  incompleteReasonBullet: {
    fontSize: 16,
    marginTop: 2,
  },
  incompleteReasonContent: {
    flex: 1,
  },
  incompleteReasonText: {
    ...typography.base,
    color: '#92400E',
    fontWeight: '500',
  },
  incompleteReasonTextError: {
    color: '#991B1B',
  },
  incompleteReasonHint: {
    ...typography.sm,
    color: '#78716C',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  acknowledgeCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: spacing.md,
  },
  acknowledgeCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#B45309',
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  acknowledgeCheckboxChecked: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },
  acknowledgeCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  acknowledgeCheckboxLabel: {
    ...typography.sm,
    color: '#78350F',
    flex: 1,
    lineHeight: 20,
  },
  // Scanned Documents Viewer Styles
  scannedDocsViewerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scannedDocsViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scannedDocsViewerTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  scannedDocsViewerSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  scannedDocsViewerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedDocsViewerCloseBtnText: {
    fontSize: 20,
    color: colors.foreground,
  },
  scannedDocsViewerScroll: {
    flex: 1,
  },
  scannedDocsViewerScrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  scannedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scannedDocThumbnailContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedDocPlaceholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  scannedDocPlaceholderIcon: {
    marginBottom: spacing.xs,
  },
  scannedDocPlaceholderMethod: {
    marginTop: spacing.xs,
  },
  scannedDocInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  scannedDocTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  scannedDocTypeLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  scannedDocTypeIcon: {
    marginRight: 0, // Spacing handled by parent gap
  },
  scannedDocTimestamp: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  scannedDocMethod: {
    ...typography.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  scannedDocDeleteBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedDocsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  scannedDocsEmptyIcon: {
    opacity: 0.5,
  },
  scannedDocsEmptyTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  scannedDocsEmptySubtitle: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 300,
  },
  scannedDocsViewerFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Document Preview Modal Styles
  documentPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentPreviewContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  documentPreviewCloseBtn: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  documentPreviewCloseBtnText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  documentPreviewImage: {
    width: '100%',
    height: '80%',
  },
  deleteButton: {
    backgroundColor: colors.destructive,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    ...typography.sm,
    color: colors.destructiveForeground,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Job Notes Modal Styles
  jobNotesModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  jobNotesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  jobNotesModalTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  jobNotesModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobNotesModalScroll: {
    flex: 1,
  },
  jobNotesModalContent: {
    padding: spacing.lg,
  },
  jobNotesCard: {
    marginBottom: spacing.md,
  },
  jobNotesSafetyCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.destructive + '10',
    borderWidth: 2,
    borderColor: colors.destructive,
  },
  jobNotesSafetyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobNotesSafetyIcon: {
    marginRight: spacing.xs / 2,
  },
  jobNotesSafetyTitle: {
    color: colors.destructive,
    fontWeight: '700',
  },
  cardTitleText: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  jobNotesText: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  safetyWarningItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.destructive + '30',
  },
  safetyWarningText: {
    ...typography.base,
    color: colors.destructive,
    fontWeight: '600',
    lineHeight: 24,
  },
  previousNoteItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previousNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previousNoteDate: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  previousNoteTechnician: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  previousNoteText: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 22,
  },
  pauseModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pauseModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  pauseModalTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  pauseModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseModalContent: {
    padding: spacing.lg,
  },
  pauseModalText: {
    ...typography.base,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  pauseReasonOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pauseReasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pauseReasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pauseReasonOptionLeft: {
    flex: 1,
  },
  pauseReasonOptionText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  pauseReasonOptionTextSelected: {
    color: colors.primaryForeground,
  },
  pauseReasonOptionIcon: {
    marginLeft: spacing.sm,
  },
  pauseModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pauseModalActionButton: {
    flex: 1,
  },
  // Validation Modal Styles
  validationModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  validationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  validationModalTitle: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  validationModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationModalScroll: {
    flex: 1,
  },
  validationModalContent: {
    padding: spacing.lg,
  },
  validationNoIssues: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  validationNoIssuesText: {
    ...typography.lg,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  validationSection: {
    marginBottom: spacing.xl,
  },
  validationSectionTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  validationIssueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  validationIssueError: {
    backgroundColor: colors.destructive + '10',
    borderColor: colors.destructive + '40',
  },
  validationIssueWarning: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '40',
  },
  validationIssueContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },
  validationIssueIcon: {
    marginTop: 2,
  },
  validationIssueText: {
    flex: 1,
    gap: spacing.xs,
  },
  validationIssueMessage: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  validationIssueDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  validationIssueScreen: {
    ...typography.xs,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  // Offline Warning Banners
  offlineWarningBanner: {
    backgroundColor: colors.warning + '20',
    borderBottomWidth: 2,
    borderBottomColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  offlineOrangeBanner: {
    backgroundColor: '#FF6B35' + '20',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  offlineCriticalBanner: {
    backgroundColor: colors.destructive + '20',
    borderBottomWidth: 2,
    borderBottomColor: colors.destructive,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  offlineWarningBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineWarningBannerText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  // Offline Blocked Modal
  offlineBlockedModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBlockedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  offlineBlockedModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineBlockedModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  offlineBlockedModalCloseButton: {
    padding: spacing.xs,
  },
  offlineBlockedModalContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  offlineBlockedModalMessage: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  offlineBlockedModalDetails: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  offlineBlockedModalActions: {
    marginTop: spacing.lg,
  },
  // Service Center Modal Styles
  serviceCenterModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  serviceCenterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceCenterModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  serviceCenterModalCloseButton: {
    padding: spacing.xs,
  },
  serviceCenterModalScroll: {
    flex: 1,
  },
  serviceCenterModalContent: {
    padding: spacing.lg,
  },
  serviceCenterCard: {
    marginBottom: spacing.md,
  },
  serviceCenterName: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  serviceCenterAddress: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 24,
  },
  serviceCenterUpdateDate: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  serviceCenterNotificationOverlay: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    zIndex: 1000,
  },
  serviceCenterNotificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingRight: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 280,
  },
  serviceCenterNotificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceCenterNotificationContent: {
    flex: 1,
  },
  serviceCenterNotificationTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  serviceCenterNotificationSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  // Photo Gallery Modal Styles
  photoGalleryModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  photoGalleryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photoGalleryModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  photoGalleryModalCloseButton: {
    padding: spacing.xs,
  },
  photoGalleryScroll: {
    flex: 1,
  },
  photoGalleryContent: {
    padding: spacing.lg,
  },
  photoGalleryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  photoGalleryEmptyText: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  photoGalleryEmptySubtext: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  photoCard: {
    marginBottom: spacing.md,
  },
  photoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  photoCardInfo: {
    flex: 1,
  },
  photoCardCategory: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs / 2,
  },
  photoCardTimestamp: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  photoCardCaption: {
    ...typography.base,
    color: colors.foreground,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  photoCardCaptionRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  photoCardCaptionLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  photoCardCaptionLabelMuted: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  photoCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  photoCardActionText: {
    ...typography.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.muted + '20',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  editNoteModalOverlay: {
    flex: 1,
    backgroundColor: colors.background + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  editNoteModalContainer: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  editNoteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editNoteModalTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  editNoteModalCloseButton: {
    padding: spacing.xs,
  },
  editNoteModalContent: {
    padding: spacing.lg,
  },
  editNoteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  editNoteModalCancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted + '40',
  },
  editNoteModalCancelText: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  editNoteModalSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  editNoteModalSaveText: {
    ...typography.base,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  // P-Listed Authorization Modal Styles
  pListedAuthModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pListedAuthModalContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    maxWidth: 600,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  pListedAuthModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pListedAuthModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  pListedAuthModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  pListedAuthModalCloseButton: {
    padding: spacing.xs,
  },
  pListedAuthModalScroll: {
    maxHeight: 400,
  },
  pListedAuthModalContent: {
    padding: spacing.lg,
  },
  pListedAuthWarningText: {
    ...typography.base,
    color: colors.foreground,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  pListedAuthCard: {
    marginBottom: spacing.md,
  },
  pListedCodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pListedCodeBadge: {
    borderColor: colors.warning,
  },
  pListedAuthStatusRow: {
    marginBottom: spacing.md,
  },
  pListedAuthStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  pListedAuthStatusAuthorized: {
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
  },
  pListedAuthStatusNotAuthorized: {
    backgroundColor: colors.destructive + '15',
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  pListedAuthStatusText: {
    ...typography.base,
    fontWeight: '600',
  },
  pListedAuthStatusTextAuthorized: {
    color: colors.success,
  },
  pListedAuthStatusTextNotAuthorized: {
    color: colors.destructive,
  },
  pListedAuthDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  pListedAuthDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  pListedAuthDetailLabel: {
    ...typography.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
    flex: 1,
  },
  pListedAuthDetailValue: {
    ...typography.sm,
    color: colors.foreground,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  pListedAuthCodesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  pListedAuthCodeItem: {
    ...typography.sm,
    color: colors.foreground,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.muted + '20',
    borderRadius: borderRadius.sm,
  },
  pListedAuthError: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.destructive + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  pListedAuthErrorText: {
    ...typography.base,
    color: colors.destructive,
    fontWeight: '600',
  },
  pListedAuthAcknowledgment: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pListedAuthCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  pListedAuthCheckboxBox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  pListedAuthCheckboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pListedAuthCheckboxText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
    lineHeight: 24,
  },
  pListedAuthModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pListedAuthCancelButton: {
    flex: 1,
  },
  pListedAuthProceedButton: {
    flex: 1,
  },
  pListedAuthCodeDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  pListedAuthCodeInput: {
    marginBottom: spacing.xs,
  },
  pListedAuthCodeHelpText: {
    ...typography.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    marginTop: spacing.xs / 2,
    opacity: 0.7,
  },
  pListedAuthCodeValidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pListedAuthCodeValidText: {
    ...typography.sm,
    color: colors.success,
    fontWeight: '600',
  },
});

export default WasteCollectionScreen;
