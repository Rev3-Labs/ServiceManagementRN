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
import {syncService, SyncStatus} from '../services/syncService';
import {getUserTruckId} from '../services/userSettingsService';
import {
  startTimeTracking,
  stopTimeTracking,
  getActiveTimeTracking,
  getTimeTrackingForOrder,
  formatElapsedTime,
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
} from '../utils/responsive';

const {width, height} = Dimensions.get('window');
const gridColumns = getGridColumns();
const cardWidth = (width - spacing.lg * (gridColumns + 1)) / gridColumns;

type FlowStep =
  | 'dashboard'
  | 'order-detail'
  | 'stream-selection'
  | 'container-selection'
  | 'container-entry'
  | 'container-summary'
  | 'manifest-management'
  | 'materials-supplies'
  | 'equipment-ppe'
  | 'order-service';

interface OrderData {
  orderNumber: string;
  customer: string;
  site: string;
  city: string;
  state: string;
  genNumber?: string;
  orderType?: string;
  programs: string[];
  serviceDate: string;
  status: 'Not Started' | 'In Progress' | 'Blocked' | 'Completed';
}

interface WasteStream {
  id: string;
  profileName: string;
  profileNumber: string;
  category: string;
  hazardClass?: string;
  consolidationAllowed: boolean;
  accumulationsApply: boolean;
  specialInstructions?: string;
  flags?: string[];
  containerCount?: number;
  allowedContainers: string[];
  isDEARegulated?: boolean;
}

interface ContainerType {
  id: string;
  size: string;
  capacity: string;
  code: string;
  weight: string;
  popular: boolean;
}

// Mock orders data - defined outside component to prevent recreation
const MOCK_ORDERS: OrderData[] = [
  {
    orderNumber: 'WO-2024-1234',
    customer: 'Acme Manufacturing',
    site: 'Building A - Main Facility',
    city: 'Denver',
    state: 'CO',
    genNumber: 'GEN-12345',
    programs: ['Retail', 'DEA'],
    serviceDate: 'Today, 9:00 AM',
    status: 'Not Started',
  },
  {
    orderNumber: 'WO-2024-1235',
    customer: 'Walmart',
    site: 'Store #1234',
    city: 'Aurora',
    state: 'CO',
    orderType: 'Regular Service',
    programs: ['Retail', 'Pharmacy'],
    serviceDate: 'Today, 11:00 AM',
    status: 'Not Started',
  },
  {
    orderNumber: 'WO-2024-1236',
    customer: 'Target Corporation',
    site: 'Distribution Center #567',
    city: 'Commerce City',
    state: 'CO',
    genNumber: 'GEN-12346',
    programs: ['Retail', 'Pharmacy', 'DEA'],
    serviceDate: 'Today, 1:00 PM',
    status: 'Not Started',
  },
  {
    orderNumber: 'WO-2024-1237',
    customer: 'Home Depot',
    site: 'Store #890',
    city: 'Boulder',
    state: 'CO',
    orderType: 'Emergency Service',
    programs: ['Retail'],
    serviceDate: 'Today, 3:00 PM',
    status: 'Not Started',
  },
  {
    orderNumber: 'WO-2024-1238',
    customer: 'Costco Wholesale',
    site: 'Warehouse #234',
    city: 'Westminster',
    state: 'CO',
    programs: ['Retail', 'Pharmacy'],
    serviceDate: 'Today, 4:30 PM',
    status: 'Not Started',
  },
];

// Pre-determined materials and supplies catalog (from legacy system)
const MATERIALS_CATALOG = [
  // Absorbents & Supplies
  {itemNumber: '604STK00', description: 'ABSORBENT PADS, 100/CS'},
  
  // Administrative Fees
  {itemNumber: 'ADMCOST-092', description: 'Third Party Cost Plus %'},
  {itemNumber: 'ADMPROF-002', description: 'Profile Administration Fee'},
  {itemNumber: 'ADMSETUP-002', description: 'Set up fee for Healthcare/retail'},
  {itemNumber: 'ADMSUP48-001', description: 'Priority Supply drop 24-48 hours'},
  
  // Cylinders
  {itemNumber: 'F000X303-027', description: 'Argon, Cylinder'},
  {itemNumber: 'F000X303-038', description: 'Carbon Dioxide, Cylinder'},
  
  // Labor
  {itemNumber: 'LBCHEMDT-003', description: 'Chemist, Double Time'},
  {itemNumber: 'LBCHEMOT-003', description: 'Chemist, Overtime'},
  
  // Drums - Metal
  {itemNumber: 'SPDM55NC-002', description: 'Drum, Metal, 55 gallon, New, Closed Top'},
  {itemNumber: 'SPDM55NO-002', description: 'Drum, Metal, 55 gallon, New, Open Top'},
  {itemNumber: 'SPDM30NC-001', description: 'Drum, Metal, 30 gallon, New, Closed Top'},
  {itemNumber: 'SPDM30NO-001', description: 'Drum, Metal, 30 gallon, New, Open Top'},
  
  // Drums - Poly
  {itemNumber: 'SPDP55NC-002', description: 'Drum, Poly, 55 gallon, New, Closed Top'},
  {itemNumber: 'SPDP55NO-002', description: 'Drum, Poly, 55 gallon, New, Open Top'},
  {itemNumber: 'SPDP30NC-001', description: 'Drum, Poly, 30 gallon, New, Closed Top'},
  {itemNumber: 'SPDP30NO-001', description: 'Drum, Poly, 30 gallon, New, Open Top'},
  
  // Containers & Packaging
  {itemNumber: 'SPBOX01-001', description: 'Box, Fiber, 1 cubic foot'},
  {itemNumber: 'SPBOX04-001', description: 'Box, Fiber, 4 cubic foot'},
  {itemNumber: 'SPPAIL5G-001', description: 'Pail, 5 gallon, Plastic'},
  
  // Liners & Bags
  {itemNumber: 'SPLINER55-001', description: 'Drum Liner, 55 gallon'},
  {itemNumber: 'SPLINER30-001', description: 'Drum Liner, 30 gallon'},
  {itemNumber: 'SPBAG-001', description: 'Hazardous Waste Bag, Large'},
];

interface WasteCollectionScreenProps {
  username?: string;
  onLogout?: () => void;
  onNavigate?: (screen: Screen) => void;
  onGoBack?: () => void;
}

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

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
  const [isManualWeightEntry, setIsManualWeightEntry] = useState(false);
  const [isScaleConnected, setIsScaleConnected] = useState(true); // Default to online for simulation
  const [scaleReading, setScaleReading] = useState<number | null>(null); // Simulated integer reading
  const [completedOrders, setCompletedOrders] = useState<string[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<
    Record<string, OrderData['status']>
  >({});
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
  const [truckId, setTruckId] = useState<string>('');
  const [activeTimeTracking, setActiveTimeTracking] = useState<TimeTrackingRecord | null>(null);
  const [currentOrderTimeTracking, setCurrentOrderTimeTracking] = useState<TimeTrackingRecord | null>(null);
  const [elapsedTimeDisplay, setElapsedTimeDisplay] = useState<string>('');

  // Use the mock orders
  const orders = MOCK_ORDERS;

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
        setElapsedTimeDisplay(formatElapsedTime(active.startTime));
      }
    } catch (error) {
      console.error('Error loading active time tracking:', error);
    }
  }, []);

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
        setElapsedTimeDisplay(formatElapsedTime(tracking.startTime));
      } else {
        setCurrentOrderTimeTracking(null);
        setElapsedTimeDisplay('');
      }
    } catch (error) {
      console.error('Error loading current order time tracking:', error);
      setCurrentOrderTimeTracking(null);
      setElapsedTimeDisplay('');
    }
  }, [selectedOrderData, dashboardSelectedOrder]);

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
    setElapsedTimeDisplay(formatElapsedTime(currentOrderTimeTracking.startTime));

    // Update every minute
    const interval = setInterval(() => {
      if (currentOrderTimeTracking && !currentOrderTimeTracking.endTime) {
        setElapsedTimeDisplay(formatElapsedTime(currentOrderTimeTracking.startTime));
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentOrderTimeTracking]);


  // Helper function to get order status (checks both original status and completed state)
  const getOrderStatus = useCallback(
    (order: OrderData): OrderData['status'] => {
      if (completedOrders.includes(order.orderNumber)) {
        return 'Completed';
      }
      return orderStatuses[order.orderNumber] || order.status;
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

  // Initialize master-detail view: auto-select first order if using master-detail and no order is selected
  useEffect(() => {
    if (useMasterDetail && isTablet() && !dashboardSelectedOrder && currentStep === 'dashboard') {
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

  // Handle starting service - starts time tracking
  const handleStartService = useCallback(async (order: OrderData) => {
    try {
      // Start time tracking for this order
      await startTimeTracking(order.orderNumber, truckId, username);
      
      // Load the active tracking to update UI
      const active = await getActiveTimeTracking();
      setActiveTimeTracking(active);
      
      // Load time tracking for this specific order
      const orderTracking = await getTimeTrackingForOrder(order.orderNumber);
      setCurrentOrderTimeTracking(orderTracking);
      if (orderTracking && !orderTracking.endTime) {
        setElapsedTimeDisplay(formatElapsedTime(orderTracking.startTime));
      }
      
      // Set selected order and navigate to stream selection
      setSelectedOrderData(order);
      setCurrentStep('stream-selection');
    } catch (error) {
      console.error('Error starting time tracking:', error);
      // Still allow navigation even if tracking fails
      setSelectedOrderData(order);
      setCurrentStep('stream-selection');
    }
  }, [truckId, username]);

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
  ];

  const wasteStreams: WasteStream[] = [
    {
      id: 'D001',
      profileName: 'Hazardous Waste',
      profileNumber: 'D001',
      category: 'Hazardous',
      hazardClass: 'Class 8',
      consolidationAllowed: true,
      accumulationsApply: true,
      specialInstructions: 'Handle with care',
      flags: ['Flammable', 'Toxic'],
      containerCount: 5,
      allowedContainers: ['30G', '55G', '85G'],
    },
    {
      id: 'U001',
      profileName: 'Universal Waste - Lamps',
      profileNumber: 'U001',
      category: 'Universal',
      consolidationAllowed: false,
      accumulationsApply: false,
      specialInstructions: 'Store in designated area',
      flags: ['Non-Hazardous'],
      containerCount: 3,
      allowedContainers: ['1YD', '2YD', '4YD'],
    },
    {
      id: 'N001',
      profileName: 'Non-Hazardous Solid Waste',
      profileNumber: 'N001',
      category: 'Non-Hazardous',
      consolidationAllowed: true,
      accumulationsApply: false,
      specialInstructions: 'Regular disposal',
      flags: ['Recyclable'],
      containerCount: 2,
      allowedContainers: ['5G', '30G', '55G', '95T', 'BULK'],
    },
  ];

  // Memoize filtered streams to prevent unnecessary re-renders
  const filteredStreams = useMemo(() => {
    if (!streamSearchQuery.trim()) {
      return wasteStreams;
    }
    const searchLower = streamSearchQuery.toLowerCase();
    return wasteStreams.filter(stream => {
      return (
        stream.profileName.toLowerCase().includes(searchLower) ||
        stream.profileNumber.toLowerCase().includes(searchLower) ||
        stream.category.toLowerCase().includes(searchLower)
      );
    });
  }, [streamSearchQuery]);

  // Sync Status Indicator Component
  const SyncStatusIndicator: React.FC<{
    status: SyncStatus;
    pendingCount: number;
  }> = ({status, pendingCount}) => {
    const getStatusStyle = () => {
      switch (status) {
        case 'synced':
          return styles.syncStatusSynced;
        case 'syncing':
          return styles.syncStatusSyncing;
        case 'offline':
          return styles.syncStatusOffline;
        case 'pending':
          return styles.syncStatusPending;
        case 'error':
          return styles.syncStatusError;
        default:
          return styles.syncStatusSynced;
      }
    };

    const getDotStyle = () => {
      switch (status) {
        case 'synced':
          return styles.syncDotSynced;
        case 'syncing':
          return styles.syncDotSyncing;
        case 'offline':
          return styles.syncDotOffline;
        case 'pending':
          return styles.syncDotPending;
        case 'error':
          return styles.syncDotError;
        default:
          return styles.syncDotSynced;
      }
    };

    const getTextStyle = () => {
      switch (status) {
        case 'synced':
          return styles.syncTextSynced;
        case 'syncing':
          return styles.syncTextSyncing;
        case 'offline':
          return styles.syncTextOffline;
        case 'pending':
          return styles.syncTextPending;
        case 'error':
          return styles.syncTextError;
        default:
          return styles.syncTextSynced;
      }
    };

    const getStatusText = () => {
      switch (status) {
        case 'synced':
          return 'Synced';
        case 'syncing':
          return 'Syncing...';
        case 'offline':
          return 'Offline';
        case 'pending':
          return `Pending (${pendingCount})`;
        case 'error':
          return 'Error';
        default:
          return 'Synced';
      }
    };

    return (
      <View style={[styles.syncStatus, getStatusStyle()]}>
        {status === 'syncing' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.syncDot, getDotStyle()]} />
        )}
        <Text style={[styles.syncText, getTextStyle()]}>{getStatusText()}</Text>
        {pendingCount > 0 && status !== 'pending' && (
          <Badge variant="secondary" style={styles.syncBadge}>
            {pendingCount}
          </Badge>
        )}
      </View>
    );
  };

  // Master-Detail Dashboard Screen (for tablets)
  const DashboardScreenMasterDetail = () => {
    const allOrders = MOCK_ORDERS || orders || [];
    // Show all orders, including completed ones
    const filteredOrders = allOrders;
    const selectedOrder = dashboardSelectedOrder || filteredOrders[0] || null;
    const isSelectedOrderCompleted = selectedOrder
      ? isOrderCompleted(selectedOrder.orderNumber)
      : false;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerContent}
            onPress={() => onNavigate?.('Settings')}
            activeOpacity={0.7}>
            <Text style={styles.headerTitle}>
              {username ? `Welcome, ${username}` : 'Welcome'}
            </Text>
            {truckId ? (
              <Text style={styles.headerSubtitle}>Truck: {truckId}</Text>
            ) : (
              <Text style={styles.headerSubtitle}>Set Truck ID</Text>
            )}
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingSyncCount}
            />
            {filteredOrders.filter(order => isOrderCompleted(order.orderNumber)).length > 0 && (
              <Button
                title="Drop Waste"
                variant="primary"
                size="md"
                onPress={() => setShowDropWasteModal(true)}
              />
            )}

            <Button
              title="Sync"
              variant="outline"
              size="md"
              onPress={handleManualSync}
              disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
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

        <View style={styles.masterDetailContainer}>
          {/* Master Pane - Orders List */}
          <View style={styles.masterPane}>
            <View style={styles.masterPaneHeader}>
              <Text style={styles.masterPaneTitle}>Today's Orders</Text>
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
                          getOrderStatus(order) === 'Not Started'
                            ? 'secondary'
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
                      {order.customer}
                    </Text>
                    <Text style={styles.masterOrderSite}>
                      {order.site} • {order.city}, {order.state}
                    </Text>
                    <Text style={styles.masterOrderTime}>
                      {order.serviceDate}
                    </Text>
                    {order.genNumber && (
                      <View style={styles.masterOrderBadges}>
                        <Badge
                          variant="outline"
                          style={styles.masterOrderMetaBadge}>
                          {order.genNumber}
                        </Badge>
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
                      getOrderStatus(selectedOrder) === 'Not Started'
                        ? 'secondary'
                        : getOrderStatus(selectedOrder) === 'In Progress'
                          ? 'default'
                          : getOrderStatus(selectedOrder) === 'Completed'
                            ? 'default'
                            : 'destructive'
                    }>
                    {getOrderStatus(selectedOrder)}
                  </Badge>
                </View>

                <Card style={styles.detailCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Order Information</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.customer}
                      </Text>
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
                        {selectedOrder.city}, {selectedOrder.state}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Date:</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.serviceDate}
                      </Text>
                    </View>
                    {selectedOrder.genNumber && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Generator Number:
                        </Text>
                        <Text style={styles.detailValue}>
                          {selectedOrder.genNumber}
                        </Text>
                      </View>
                    )}
                    {selectedOrder.orderType && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Order Type:</Text>
                        <Text style={styles.detailValue}>
                          {selectedOrder.orderType}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.programsDetailRow]}>
                      <Text style={styles.detailLabel}>Programs:</Text>
                      <View style={styles.programsContainerInline}>
                        {selectedOrder.programs.map((program, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            style={styles.programBadge}>
                            {program}
                          </Badge>
                        ))}
                      </View>
                    </View>
                  </CardContent>
                </Card>

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

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerContent}
            onPress={() => onNavigate?.('Settings')}
            activeOpacity={0.7}>
            <Text style={styles.headerTitle}>
              {username ? `Welcome, ${username}` : 'Welcome'}
            </Text>
            {truckId ? (
              <Text style={styles.headerSubtitle}>Truck: {truckId}</Text>
            ) : (
              <Text style={styles.headerSubtitle}>Set Truck ID</Text>
            )}
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingSyncCount}
            />
            {completedOrdersList.length > 0 && (
              <Button
                title="Drop Waste"
                variant="primary"
                size="md"
                onPress={() => setShowDropWasteModal(true)}
              />
            )}
            <Button
              title="Service Closeout"
              variant="outline"
              size="md"
              onPress={() => onNavigate?.('ServiceCloseout')}
            />
            <Button
              title="Sync"
              variant="outline"
              size="md"
              onPress={handleManualSync}
              disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
            />
            {isTablet() && (
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
          <View style={styles.pageTitleContent}>
            <Text style={styles.pageTitleLogo}>Clean Earth Inc.</Text>
            <Text style={styles.pageTitleText}>Today's Orders</Text>
          </View>
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
                    handleStartService(order);
                  }}
                  activeOpacity={0.7}>
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardHeaderLeft}>
                      <Text style={styles.orderNumber}>
                        {order.orderNumber}
                      </Text>
                      {order.genNumber && (
                        <Badge variant="outline">{order.genNumber}</Badge>
                      )}
                      {order.orderType && (
                        <Badge variant="outline">{order.orderType}</Badge>
                      )}
                    </View>
                    <Badge
                      variant={
                        getOrderStatus(order) === 'Not Started'
                          ? 'secondary'
                          : getOrderStatus(order) === 'In Progress'
                            ? 'default'
                            : 'destructive'
                      }>
                      {getOrderStatus(order)}
                    </Badge>
                  </View>
                  <View style={styles.orderCardBody}>
                    <Text style={styles.customerName}>{order.customer}</Text>
                    <Text style={styles.siteInfo}>
                      {order.site} • {order.city}, {order.state}
                    </Text>
                    <Text style={styles.serviceDate}>{order.serviceDate}</Text>
                    <View style={styles.programsContainer}>
                      {order.programs.map((program, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          style={styles.programBadge}>
                          {program}
                        </Badge>
                      ))}
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

            {/* Completed Orders Section */}
            {completedOrdersList.length > 0 && (
              <View style={styles.completedOrdersSection}>
                <View style={styles.completedOrdersHeader}>
                  <Text style={styles.completedOrdersTitle}>
                    ✓ Completed ({completedOrdersList.length})
                  </Text>
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
                          {order.customer}
                        </Text>
                      </View>
                      <View style={styles.completedOrderRight}>
                        <Text style={styles.completedOrderCheck}>✓</Text>
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

  // StreamSelectionScreen component - defined as a stable component
  const StreamSelectionScreen = () => {
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('dashboard')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order #WO-2024-1234'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>
              {selectedOrderData?.customer || 'Customer Name'} -{' '}
              {selectedOrderData?.site || 'Site Location'}
            </Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

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
              {filteredStreams.map(stream => (
                <TouchableOpacity
                  key={stream.id}
                  style={styles.streamCard}
                  onPress={() => {
                    if (!isCurrentOrderCompleted) {
                      setSelectedStream(stream.profileName);
                      setSelectedStreamCode(stream.profileNumber);
                      setSelectedStreamId(stream.id);
                      setCurrentStep('container-selection');
                    }
                  }}
                  disabled={isCurrentOrderCompleted}
                  activeOpacity={isCurrentOrderCompleted ? 1 : 0.7}>
                  <View style={styles.streamCardHeader}>
                    <Badge variant="outline">{stream.profileNumber}</Badge>
                  </View>
                  <Text style={styles.streamCardTitle}>
                    {stream.profileName}
                  </Text>
                  <Text style={styles.streamCardCategory}>
                    {stream.category}
                  </Text>
                  <Text style={styles.streamCardHazard}>
                    {stream.hazardClass
                      ? `Hazard Class: ${stream.hazardClass}`
                      : 'Non-Hazardous'}
                  </Text>
                </TouchableOpacity>
              ))}
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

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('stream-selection')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order #WO-2024-1234'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>{selectedStream}</Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

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

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('container-selection')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order #WO-2024-1234'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>
              {selectedStream} • {selectedContainerType?.size || 'Container'}
            </Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={false}
          scrollEventThrottle={16}>
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
                    <Text style={styles.inlineWarningText}>
                      ⚠️ Approaching capacity (
                      {Math.round((netWeight / weightLimits.max) * 100)}% of{' '}
                      {weightLimits.max} lbs)
                    </Text>
                  </View>
                )}
                {showHardWarning && (
                  <View style={styles.inlineWarningHard}>
                    <Text style={styles.inlineWarningText}>
                      ⚠️ EXCEEDS MAXIMUM ({netWeight} lbs / {weightLimits.max}{' '}
                      lbs max) - Must consolidate or use new container
                    </Text>
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
                  <Text style={styles.manualEntryText}>
                    ⚠️ Weight entered manually
                  </Text>
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
            disabled={isCurrentOrderCompleted}
            onPress={async () => {
              if (
                selectedContainerType &&
                selectedStream &&
                !isCurrentOrderCompleted
              ) {
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

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('container-entry')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order Summary'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>Container Summary</Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Text style={styles.summaryText}>
              Showing {addedContainers.length} container
              {addedContainers.length !== 1 ? 's' : ''}
            </Text>

            {addedContainers.length > 0 ? (
              addedContainers.map((container, index) => (
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
            disabled={addedContainers.length === 0 || isCurrentOrderCompleted}
            onPress={() => {
              if (!isCurrentOrderCompleted) {
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
    const orderPrograms = selectedOrderData?.programs || [];
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('container-summary')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>Manifest Management</Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Manifest Shipment</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Summary Information Section */}
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
                    <View style={styles.manifestSummaryDivider} />
                    <View style={styles.manifestSummaryItem}>
                      <Text style={styles.manifestSummaryLabel}>
                        Programs to Ship
                      </Text>
                      <Text style={styles.manifestSummaryValue}>
                        {
                          Object.values(selectedPrograms).filter(
                            p => p === 'ship',
                          ).length
                        }{' '}
                        / {orderPrograms.length}
                      </Text>
                    </View>
                    {manifestTrackingNumber && (
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
                    )}
                  </View>
                </View>

                {/* Programs Section */}
                <View style={styles.programsSection}>
                  <Text style={styles.sectionTitle}>Program Selection</Text>
                  <Text style={styles.sectionDescription}>
                    Toggle each program to Ship or No Ship
                  </Text>

                  {orderPrograms.length > 0 ? (
                    orderPrograms.map(program => {
                      const isShip = selectedPrograms[program] === 'ship';
                      const isNoShip = selectedPrograms[program] === 'noship';
                      const toggleValue = isShip; // true = ship, false = noship (or undefined)

                      return (
                        <View key={program} style={styles.programSelectionRow}>
                          <Text style={styles.programName}>{program}</Text>
                          <View style={styles.programToggleContainer}>
                            <Text style={styles.programStatusLabel}>
                              {isShip
                                ? 'Ship'
                                : isNoShip
                                  ? 'No Ship'
                                  : 'No Ship'}
                            </Text>
                            <Switch
                              value={toggleValue}
                              disabled={isCurrentOrderCompleted}
                              onValueChange={async value => {
                                if (isCurrentOrderCompleted) return;
                                const action: 'ship' | 'noship' = value
                                  ? 'ship'
                                  : 'noship';
                                const updated = {
                                  ...selectedPrograms,
                                  [program]: action,
                                };
                                setSelectedPrograms(updated);
                                // Queue for sync
                                await syncService.addPendingOperation(
                                  'manifest',
                                  {
                                    orderId: selectedOrderData?.orderNumber,
                                    program,
                                    action,
                                  },
                                );
                              }}
                            />
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyStateText}>
                      No programs found for this order
                    </Text>
                  )}
                </View>

                {/* Scanned Document Indicator */}
                {manifestData?.scannedImageUri && (
                  <View style={styles.scannedImageIndicator}>
                    <Text style={styles.scannedImageText}>
                      ✓ Manifest document scanned and uploaded
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </ScrollView>
        </View>

        {/* Fixed Footer with Manifest Actions */}
        <View style={styles.manifestActionsFooter}>
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
                <Text style={styles.signatureModalCloseBtnText}>✕</Text>
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
                <Text style={styles.manifestPreviewCloseBtnText}>✕</Text>
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
                    <View style={{flexDirection: 'row', gap: 16}}>
                      <Text style={styles.epaFormCellValue}>☐ Import to U.S.</Text>
                      <Text style={styles.epaFormCellValue}>☐ Export from U.S.</Text>
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
                    <View style={{flexDirection: 'row', gap: 16}}>
                      <Text style={styles.epaFormCellValue}>☐ Quantity</Text>
                      <Text style={styles.epaFormCellValue}>☐ Type</Text>
                      <Text style={styles.epaFormCellValue}>☐ Residue</Text>
                      <Text style={styles.epaFormCellValue}>☐ Partial Rejection</Text>
                      <Text style={styles.epaFormCellValue}>☐ Full Rejection</Text>
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
                    <Text style={styles.bottomSheetOptionIconText}>🖨️</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Print Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Print the hazardous waste manifest document
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={async () => {
                    setShowPrintOptions(false);
                    await printLDR();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>📄</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Print LDR</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Print the Land Disposal Restrictions notification
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => {
                    setShowPrintOptions(false);
                    voidManifest();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEE2E2'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>❌</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Void Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Void the current manifest document
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
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

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('manifest-management')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>
              Supplies
            </Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

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
                                <Text style={styles.quantityEditButtonText}>
                                  ✓
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingQuantityId(null);
                                  setEditQuantityValue('');
                                }}
                                style={styles.quantityEditButton}>
                                <Text style={styles.quantityEditButtonText}>
                                  ✕
                                </Text>
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

    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('manifest-management')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>Equipment</Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

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
                                <Text style={styles.quantityEditButtonText}>
                                  ✓
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingEquipmentId(null);
                                  setEditEquipmentCount('');
                                }}
                                style={styles.quantityEditButton}>
                                <Text style={styles.quantityEditButtonText}>
                                  ✕
                                </Text>
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
                <Text style={styles.fullScreenModalCloseText}>✕</Text>
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
                      <Text style={styles.addSuccessText}>
                        ✓ Equipment added successfully!
                      </Text>
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
    const totalNetWeight = addedContainers.reduce(
      (sum, c) => sum + c.netWeight,
      0,
    );
    const programsToShip = Object.values(selectedPrograms).filter(
      p => p === 'ship',
    ).length;
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

      if (selectedOrderData) {
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

        // Stop time tracking for this order
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
      }
      setCurrentStep('dashboard');
    };

    // Customer Acknowledgment View
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('manifest-management')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.screenHeaderContent}>
            <Text style={styles.screenHeaderTitle}>
              {selectedOrderData?.orderNumber || 'Order'}
            </Text>
            <Text style={styles.screenHeaderSubtitle}>
              Customer Acknowledgment
            </Text>
          </View>
          {elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData && (
            <View style={styles.timeTrackingBadge}>
              <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
            </View>
          )}
        </View>

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
                      <Text style={styles.incompleteWarningIcon}>⚠️</Text>
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
                          {item.severity === 'error' ? '❌' : '⚠️'}
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
                          <Text style={styles.acknowledgeCheckmark}>✓</Text>
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
            title="Acknowledge & Complete"
            variant="primary"
            size="md"
            onPress={handleCompleteOrder}
          />
        </View>
      </View>
    );
  };

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
              `;
              captureBtn.textContent = '📸 Capture Photo';

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

    // Calculate counts for badges
    const containersCount = addedContainers.length;
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
          <Text style={styles.quickActionHomeIcon}>🏠</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickActionButton,
            isTablet() && styles.quickActionButtonTablet,
          ]}
          onPress={() => setCurrentStep('container-summary')}
          activeOpacity={0.7}>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionIcon}>📋</Text>
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
            <Text style={styles.quickActionIcon}>📦</Text>
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
            <Text style={styles.quickActionIcon}>🛡️</Text>
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
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            isTablet() && styles.quickActionButtonTablet,
          ]}
          onPress={() => {
            // If documents exist, show options menu; otherwise go straight to scan
            if (scannedDocsCount > 0) {
              setShowDocumentOptionsMenu(true);
            } else {
              handleScanDocuments();
            }
          }}
          activeOpacity={0.7}>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionIcon}>📷</Text>
            <Text style={styles.quickActionLabel}>
              {scannedDocsCount > 0 ? 'Documents' : 'Scan Documents'}
            </Text>
            {scannedDocsCount > 0 && (
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>
                  {scannedDocsCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

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
                <Text style={styles.bottomSheetTitle}>📷 Documents</Text>
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
                    <Text style={styles.bottomSheetOptionIconText}>📋</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>View Documents</Text>
                    <Text style={styles.bottomSheetOptionDesc}>See all scanned documents</Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => {
                    setShowDocumentOptionsMenu(false);
                    handleScanDocuments();
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#D1FAE5'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>📷</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Scan New Document</Text>
                    <Text style={styles.bottomSheetOptionDesc}>Capture manifest, LDR, or BOL</Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
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
                    <Text style={styles.bottomSheetOptionIconText}>📋</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Manifest</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Hazardous waste manifest (EPA Form 8700-22)
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => captureDocument('ldr')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>📄</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>LDR</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Land Disposal Restrictions notification
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => captureDocument('bol')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#D1FAE5'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>🚚</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>BOL</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Bill of Lading for shipment
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
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
                    <Text style={styles.bottomSheetOptionIconText}>📷</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Take Photo</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Use camera to capture the document
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => handleCaptureWithMethod('gallery')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Text style={styles.bottomSheetOptionIconText}>📁</Text>
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Choose from Files</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Select an existing image file
                    </Text>
                  </View>
                  <Text style={styles.bottomSheetOptionArrow}>→</Text>
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
                <Text style={styles.scannedDocsViewerCloseBtnText}>✕</Text>
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
                  const typeIcons = {manifest: '📋', ldr: '📄', bol: '🚚'};
                  const captureMethod = (doc as any).captureMethod || 'Camera';
                  const methodIcon = captureMethod === 'Camera' ? '📷' : '📁';
                  
                  return (
                    <View key={doc.id} style={styles.scannedDocCard}>
                      {/* Document visual placeholder */}
                      <View 
                        style={[
                          styles.scannedDocThumbnailContainer, 
                          {backgroundColor: typeColors[doc.documentType]}
                        ]}>
                        <View style={styles.scannedDocPlaceholderContent}>
                          <Text style={styles.scannedDocPlaceholderIcon}>
                            {typeIcons[doc.documentType]}
                          </Text>
                          <Text style={styles.scannedDocPlaceholderMethod}>
                            {methodIcon}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.scannedDocInfo}>
                        <View style={[styles.scannedDocTypeBadge, {backgroundColor: typeColors[doc.documentType]}]}>
                          <Text style={styles.scannedDocTypeIcon}>{typeIcons[doc.documentType]}</Text>
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
                        <Text style={styles.scannedDocDeleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

              {scannedDocsCount === 0 && (
                <View style={styles.scannedDocsEmptyState}>
                  <Text style={styles.scannedDocsEmptyIcon}>📷</Text>
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
        // Use master-detail on tablets if enabled, otherwise use full-screen
        if (isTablet() && useMasterDetail) {
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
        if (isTablet() && useMasterDetail) {
          return <DashboardScreenMasterDetail />;
        }
        return <DashboardScreen />;
    }
  };

  // Handle drop waste submission
  const handleDropWaste = (transferLocation: string, dropDate: string, dropTime: string) => {
    // Here you would typically send this data to your backend
    console.log('[Drop Waste]', {
      truckId,
      transferLocation,
      dropDate,
      dropTime,
      completedOrders: completedOrders.length,
      containers: addedContainers.length,
    });
    
    Alert.alert(
      'Waste Dropped',
      `Successfully recorded waste drop at ${transferLocation} on ${dropDate} at ${dropTime}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowDropWasteModal(false);
            // Optionally clear completed orders after successful drop
            // setCompletedOrders([]);
            // setContainers([]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {renderScreen()}
      <QuickActionsBar />
      
      {/* Drop Waste Modal */}
      <DropWasteModal
        visible={showDropWasteModal}
        onClose={() => setShowDropWasteModal(false)}
        onDropWaste={handleDropWaste}
        truckId={truckId}
        completedOrdersCount={completedOrders.length}
        containersToDropCount={addedContainers.length}
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
              <Text style={styles.fullScreenModalCloseText}>✕</Text>
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
                {showAddMaterialSuccess && (
                  <View style={styles.addSuccessIndicator}>
                    <Text style={styles.addSuccessText}>
                      ✓ Material added successfully!
                    </Text>
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
              <Text style={styles.labelPrintingIcon}>🖨️</Text>
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
            Alert.alert(
              'Cancel Checklist',
              'Are you sure you want to cancel? Your progress will be lost.',
              [
                {text: 'No', style: 'cancel'},
                {
                  text: 'Yes',
                  style: 'destructive',
                  onPress: () => setShowChecklistModal(false),
                },
              ]
            );
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
  headerContent: {
    flex: 1,
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
  completedOrderCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  programBadge: {
    marginRight: spacing.xs,
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  streamCardTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  streamCardCategory: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  streamCardHazard: {
    ...typography.sm,
    color: colors.mutedForeground,
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
  inlineWarningText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
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
  programName: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
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
  addSuccessText: {
    ...typography.base,
    color: colors.success || colors.primary,
    fontWeight: '600',
    textAlign: 'center',
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
    width: 400,
    minWidth: 320,
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
  detailCard: {
    marginBottom: spacing.lg,
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
  detailActions: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
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
  manifestActionsFooter: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // @ts-ignore - web-specific style
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    elevation: 8,
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
  labelPrintingIcon: {
    fontSize: 24,
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
    fontSize: 32,
  },
  scannedDocPlaceholderMethod: {
    fontSize: 20,
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
  scannedDocTypeIcon: {
    fontSize: 16,
  },
  scannedDocTypeLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
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
  scannedDocDeleteBtnText: {
    fontSize: 20,
  },
  scannedDocsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  scannedDocsEmptyIcon: {
    fontSize: 64,
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
});

export default WasteCollectionScreen;
