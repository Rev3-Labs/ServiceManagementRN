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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Swipeable} from 'react-native-gesture-handler';
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

// Pre-determined materials and supplies catalog
const MATERIALS_CATALOG = [
  {itemNumber: 'MAT-001', description: 'Personal Protective Equipment (PPE)'},
  {itemNumber: 'MAT-002', description: 'Safety Glasses'},
  {itemNumber: 'MAT-003', description: 'Nitrile Gloves'},
  {itemNumber: 'MAT-004', description: 'Protective Suit'},
  {itemNumber: 'MAT-005', description: 'Respirator'},
  {itemNumber: 'MAT-006', description: 'Cleaning Supplies'},
  {itemNumber: 'MAT-007', description: 'Container Labels'},
  {itemNumber: 'MAT-008', description: 'Documentation Forms'},
  {itemNumber: 'MAT-009', description: 'Absorbent Pads'},
  {itemNumber: 'MAT-010', description: 'Spill Kit'},
  {itemNumber: 'MAT-011', description: 'Hazardous Waste Bags'},
  {itemNumber: 'MAT-012', description: 'Drum Liners'},
  {itemNumber: 'MAT-013', description: 'Seal Tape'},
  {itemNumber: 'MAT-014', description: 'Barcode Labels'},
  {itemNumber: 'MAT-015', description: 'Manifest Forms'},
];

interface WasteCollectionScreenProps {
  onLogout?: () => void;
}

const WasteCollectionScreen: React.FC<WasteCollectionScreenProps> = ({
  onLogout,
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('dashboard');
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
  const [grossWeight, setGrossWeight] = useState('285');
  const [barcode, setBarcode] = useState('');
  const [isManualWeightEntry, setIsManualWeightEntry] = useState(false);
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
  } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
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
  const [useMasterDetail, setUseMasterDetail] = useState(false); // Toggle for master-detail view
  const [dashboardSelectedOrder, setDashboardSelectedOrder] =
    useState<OrderData | null>(null); // Selected order in master-detail view
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Use the mock orders
  const orders = MOCK_ORDERS;

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
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Welcome, John Smith</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingSyncCount}
            />
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
                  </CardContent>
                </Card>

                <Card style={styles.detailCard}>
                  <CardHeader>
                    <CardTitle>
                      <CardTitleText>Programs</CardTitleText>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.programsContainer}>
                      {selectedOrder.programs.map((program, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          style={styles.programBadge}>
                          {program}
                        </Badge>
                      ))}
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
                      if (!isSelectedOrderCompleted) {
                        setSelectedOrderData(selectedOrder);
                        setCurrentStep('stream-selection');
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
    // Show all orders, including completed ones
    const filteredOrders = allOrders;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Welcome, John Smith</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingSyncCount}
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
                  // Show all orders, including completed ones
                  const filteredOrders = allOrders;
                  // Auto-select first order when switching to master-detail
                  if (filteredOrders.length > 0 && !dashboardSelectedOrder) {
                    setDashboardSelectedOrder(filteredOrders[0]);
                  }
                  setUseMasterDetail(true);
                }}
              />
            )}
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
            <Text style={styles.ordersCount}>
              {filteredOrders.length} order
              {filteredOrders.length !== 1 ? 's' : ''} scheduled for today
              {completedOrders.length > 0 && (
                <Text style={styles.completedOrdersCount}>
                  {' '}
                  ({completedOrders.length} completed)
                </Text>
              )}
            </Text>

            {filteredOrders.length > 0 ? (
              filteredOrders.map((order, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.orderCard,
                    isTablet() && styles.orderCardTablet,
                  ]}
                  onPress={() => {
                    if (!isOrderCompleted(order.orderNumber)) {
                      setSelectedOrderData(order);
                      setCurrentStep('stream-selection');
                    }
                  }}
                  disabled={isOrderCompleted(order.orderNumber)}
                  activeOpacity={isOrderCompleted(order.orderNumber) ? 1 : 0.7}>
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
                            : getOrderStatus(order) === 'Completed'
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
                <Text style={styles.emptyStateTitle}>No Orders Scheduled</Text>
                <Text style={styles.emptyStateText}>
                  You have no orders scheduled for today.
                </Text>
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
          <Button
            title="Back"
            variant="outline"
            size="md"
            onPress={() => setCurrentStep('dashboard')}
          />
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
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
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

    // Handle Bluetooth scale weight capture
    const handleBluetoothScaleCapture = async () => {
      // TODO: Implement Bluetooth scale integration
      // This would connect to a Bluetooth scale and capture weight
      // For now, this is a placeholder
      Alert.alert(
        'Bluetooth Scale',
        'Bluetooth scale integration will be implemented here. This will automatically capture weight from the connected scale.',
      );
      setIsManualWeightEntry(false);
    };

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
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <Card>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Weight Information</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Bluetooth Scale Button */}
              <Button
                title="Read Scale Weight"
                variant="outline"
                size="md"
                disabled={isCurrentOrderCompleted}
                onPress={handleBluetoothScaleCapture}
                style={{marginBottom: spacing.md}}
              />

              <View style={styles.weightInputsRow}>
                <View style={styles.weightInput}>
                  <Input
                    label="Tare Weight (lbs)"
                    value={tareWeight}
                    onChangeText={value =>
                      handleManualWeightChange('tare', value)
                    }
                    keyboardType="numeric"
                    editable={!isCurrentOrderCompleted}
                  />
                </View>
                <View style={styles.weightInput}>
                  <Input
                    label="Gross Weight (lbs)"
                    value={grossWeight}
                    onChangeText={value =>
                      handleManualWeightChange('gross', value)
                    }
                    keyboardType="numeric"
                    editable={!isCurrentOrderCompleted}
                  />
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

              <View style={styles.netWeightCard}>
                <Text style={styles.netWeightLabel}>
                  Net Weight (Waste Only)
                </Text>
                <Text style={styles.netWeightValue}>{netWeight} lbs</Text>
              </View>

              {showSoftWarning && (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Soft Weight Warning</Text>
                  <Text style={styles.warningText}>
                    Container is approaching maximum capacity (
                    {Math.round((netWeight / weightLimits.max) * 100)}% of{' '}
                    {weightLimits.max} lbs max). Consider consolidation or new
                    container.
                  </Text>
                </View>
              )}

              {showHardWarning && (
                <View style={[styles.warningCard, styles.hardWarningCard]}>
                  <Text style={[styles.warningTitle, styles.hardWarningTitle]}>
                    Hard Weight Limit Exceeded
                  </Text>
                  <Text style={styles.warningText}>
                    Container exceeds maximum weight of {weightLimits.max} lbs.
                    Reduce weight or select larger container.
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

                // Auto-print shipping label
                await printShippingLabel(newContainer);

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
    const swipeableRefs = useRef<{[key: string]: Swipeable | null}>({});
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
      // Close the swipeable
      setTimeout(() => {
        swipeableRefs.current[containerId]?.close();
      }, 100);
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
          <Button
            title="Add Container"
            variant="primary"
            size="md"
            disabled={isCurrentOrderCompleted}
            onPress={() => {
              if (!isCurrentOrderCompleted) {
                setCurrentStep('stream-selection');
              }
            }}
          />
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
                <Swipeable
                  key={container.id}
                  ref={ref => {
                    swipeableRefs.current[container.id] = ref;
                  }}
                  renderRightActions={
                    isCurrentOrderCompleted
                      ? undefined
                      : () => renderRightActions(container.id, index)
                  }
                  rightThreshold={40}
                  overshootRight={false}
                  friction={2}
                  enableTrackpadTwoFingerGesture={false}
                  enabled={!isCurrentOrderCompleted}>
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
                      <View style={styles.containerSummaryInfoRow}>
                        <View style={styles.containerSummaryInfoItem}>
                          <Text style={styles.containerSummaryInfoLabel}>
                            Stream Code
                          </Text>
                          <Text style={styles.containerSummaryInfoValue}>
                            {container.streamCode}
                          </Text>
                        </View>
                        <View style={styles.containerSummaryInfoItem}>
                          <Text style={styles.containerSummaryInfoLabel}>
                            Barcode
                          </Text>
                          <Text style={styles.containerSummaryInfoValue}>
                            {container.barcode}
                          </Text>
                        </View>
                      </View>
                      {container.shippingLabelBarcode && (
                        <View style={styles.containerSummaryInfoRow}>
                          <View style={styles.containerSummaryInfoItem}>
                            <Text style={styles.containerSummaryInfoLabel}>
                              Shipping Label
                            </Text>
                            <Text style={styles.containerSummaryInfoValue}>
                              {container.shippingLabelBarcode}
                            </Text>
                          </View>
                          <View style={styles.containerSummaryInfoItem}>
                            <Button
                              title="Reprint Label"
                              variant="outline"
                              size="sm"
                              disabled={isCurrentOrderCompleted}
                              onPress={() => printShippingLabel(container)}
                            />
                          </View>
                        </View>
                      )}
                      <View style={styles.containerSummaryWeightsRow}>
                        <View style={styles.containerSummaryWeightItem}>
                          <Text style={styles.containerSummaryWeightLabel}>
                            Tare
                          </Text>
                          <Text style={styles.containerSummaryWeightValue}>
                            {container.tareWeight} lbs
                          </Text>
                        </View>
                        <View style={styles.containerSummaryWeightDivider} />
                        <View style={styles.containerSummaryWeightItem}>
                          <Text style={styles.containerSummaryWeightLabel}>
                            Gross
                          </Text>
                          <Text style={styles.containerSummaryWeightValue}>
                            {container.grossWeight} lbs
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Swipeable>
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
          <View />
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
            <Button
              title="Scan & Upload"
              variant="outline"
              size="md"
              disabled={isCurrentOrderCompleted}
              onPress={scanManifestWithCamera}
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
                setCurrentStep('materials-supplies');
              }
            }}
          />
        </View>

        {/* Print Preview Modal */}
        <Modal
          visible={showPrintPreview}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPrintPreview(false)}>
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setShowPrintPreview(false)}>
            <TouchableOpacity
              style={[
                styles.bottomSheetContent,
                styles.bottomSheetContentLarge,
              ]}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}>
              {/* Bottom Sheet Handle */}
              <View style={styles.bottomSheetHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>
                  Manifest Print Preview
                </Text>
              </View>

              <ScrollView style={styles.bottomSheetBody}>
                <Card>
                  <CardContent>
                    <Text style={styles.previewLabel}>Order Number:</Text>
                    <Text style={styles.previewValue}>
                      {selectedOrderData?.orderNumber || 'N/A'}
                    </Text>

                    <Text style={styles.previewLabel}>Tracking Number:</Text>
                    <Text style={styles.previewValue}>
                      {manifestTrackingNumber || 'Not assigned yet'}
                    </Text>

                    <Text style={styles.previewLabel}>Date:</Text>
                    <Text style={styles.previewValue}>
                      {new Date().toLocaleDateString()}
                    </Text>

                    <Text style={styles.previewLabel}>Total Containers:</Text>
                    <Text style={styles.previewValue}>
                      {addedContainers.length}
                    </Text>

                    <Text style={styles.previewLabel}>Programs:</Text>
                    {orderPrograms.map(program => (
                      <Text key={program} style={styles.previewValue}>
                        • {program}:{' '}
                        {selectedPrograms[program] || 'Not selected'}
                      </Text>
                    ))}

                    <Text style={styles.previewLabel}>Containers:</Text>
                    {addedContainers.map((container, index) => (
                      <View
                        key={container.id}
                        style={styles.previewContainerItem}>
                        <Text style={styles.previewValue}>
                          {index + 1}. {container.containerSize} -{' '}
                          {container.streamName}
                        </Text>
                        <Text style={styles.previewSubValue}>
                          Net Weight: {container.netWeight} lbs | Label:{' '}
                          {container.shippingLabelBarcode}
                        </Text>
                      </View>
                    ))}
                  </CardContent>
                </Card>
              </ScrollView>

              <View style={styles.bottomSheetFooter}>
                <Button
                  title="Close"
                  variant="outline"
                  size="lg"
                  onPress={() => setShowPrintPreview(false)}
                  style={styles.bottomSheetCancelButton}
                />
                <Button
                  title="Print"
                  variant="primary"
                  size="lg"
                  onPress={async () => {
                    setShowPrintPreview(false);
                    await printManifest();
                  }}
                  style={styles.bottomSheetDeleteButton}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Print Options Modal */}
        <Modal
          visible={showPrintOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPrintOptions(false)}>
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setShowPrintOptions(false)}>
            <TouchableOpacity
              style={styles.bottomSheetContent}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}>
              {/* Bottom Sheet Handle */}
              <View style={styles.bottomSheetHandle} />

              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Print Options</Text>
              </View>

              <View style={styles.bottomSheetBody}>
                <Button
                  title="Print Manifest"
                  variant="primary"
                  size="lg"
                  onPress={async () => {
                    setShowPrintOptions(false);
                    await printManifest();
                  }}
                  style={styles.printOptionButton}
                />
                <Button
                  title="Print LDR"
                  variant="primary"
                  size="lg"
                  onPress={async () => {
                    setShowPrintOptions(false);
                    await printLDR();
                  }}
                  style={styles.printOptionButton}
                />
                <Button
                  title="Void Manifest"
                  variant="destructive"
                  size="lg"
                  onPress={() => {
                    setShowPrintOptions(false);
                    voidManifest();
                  }}
                  style={styles.printOptionButton}
                />
              </View>

              <View style={styles.bottomSheetFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="lg"
                  onPress={() => setShowPrintOptions(false)}
                  style={styles.bottomSheetCancelButton}
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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
              Materials & Supplies
            </Text>
          </View>
        </View>

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
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
            title="Back"
            variant="outline"
            size="md"
            onPress={() => setCurrentStep('manifest-management')}
          />
          <Button
            title="Continue"
            variant="primary"
            size="md"
            onPress={() => setCurrentStep('order-service')}
          />
        </View>

        {/* Add Material Modal - Full Screen for Tablets */}
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
                  <ScrollView
                    style={styles.modalCatalogScroll}
                    contentContainerStyle={styles.modalCatalogContent}>
                    {MATERIALS_CATALOG.map(item => (
                      <TouchableOpacity
                        key={item.itemNumber}
                        style={[
                          styles.materialCatalogItemVertical,
                          selectedMaterialItem?.itemNumber ===
                            item.itemNumber &&
                            styles.materialCatalogItemSelected,
                        ]}
                        onPress={() => setSelectedMaterialItem(item)}>
                        <Text
                          style={[
                            styles.materialCatalogItemNumber,
                            selectedMaterialItem?.itemNumber ===
                              item.itemNumber &&
                              styles.materialCatalogItemNumberSelected,
                          ]}>
                          {item.itemNumber}
                        </Text>
                        <Text
                          style={[
                            styles.materialCatalogItemDescription,
                            selectedMaterialItem?.itemNumber ===
                              item.itemNumber &&
                              styles.materialCatalogItemDescriptionSelected,
                          ]}>
                          {item.description}
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
                        <Text style={styles.inputLabel}>Quantity</Text>
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
                            <Text
                              style={[
                                styles.materialTypeCardDescription,
                                materialType === 'used' &&
                                  styles.materialTypeCardDescriptionSelected,
                              ]}>
                              Material was used during service
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
                            <Text
                              style={[
                                styles.materialTypeCardDescription,
                                materialType === 'left_behind' &&
                                  styles.materialTypeCardDescriptionSelected,
                              ]}>
                              Material was left at customer site
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
    const [equipmentPPE, setEquipmentPPE] = useState<
      Array<{
        id: string;
        name: string;
        count: number;
      }>
    >([]);
    const [showEquipmentEntry, setShowEquipmentEntry] = useState(true);
    const [showCustomerAcknowledgment, setShowCustomerAcknowledgment] =
      useState(false);
    const [customerFirstName, setCustomerFirstName] = useState('');
    const [customerLastName, setCustomerLastName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
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

    const handleSkipEquipment = () => {
      setShowEquipmentEntry(false);
      setShowCustomerAcknowledgment(true);
    };

    const handleContinueToAcknowledgment = () => {
      setShowEquipmentEntry(false);
      setShowCustomerAcknowledgment(true);
    };

    const handleCompleteOrder = async () => {
      if (!customerFirstName.trim() || !customerLastName.trim()) {
        Alert.alert(
          'Required Fields',
          'Please enter customer first name and last name.',
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

    // Equipment Entry View
    if (showEquipmentEntry) {
      return (
        <View style={styles.container}>
          <View style={styles.screenHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep('materials-supplies')}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.screenHeaderContent}>
              <Text style={styles.screenHeaderTitle}>
                {selectedOrderData?.orderNumber || 'Order'}
              </Text>
              <Text style={styles.screenHeaderSubtitle}>Equipment & PPE</Text>
            </View>
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
                        <View
                          key={equipment.id}
                          style={styles.materialsTableRow}>
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
                              onPress={() =>
                                handleDeleteEquipment(equipment.id)
                              }
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
              title="Skip"
              variant="outline"
              size="md"
              onPress={handleSkipEquipment}
            />
            <Button
              title="Continue"
              variant="primary"
              size="md"
              onPress={handleContinueToAcknowledgment}
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
                          <Text style={styles.inputLabel}>Quantity</Text>
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
    }

    // Customer Acknowledgment View
    if (showCustomerAcknowledgment) {
      return (
        <View style={styles.container}>
          <View style={styles.screenHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setShowCustomerAcknowledgment(false);
                setShowEquipmentEntry(true);
              }}
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
          </View>

          <View style={styles.scrollViewContainer}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}>
              {/* Print-Friendly Order Summary */}
              <Card style={styles.printSummaryCard}>
                <CardHeader>
                  <CardTitle>
                    <CardTitleText>Order Summary</CardTitleText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <View style={styles.printSummarySection}>
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>
                        Order Number:
                      </Text>
                      <Text style={styles.printSummaryValue}>
                        {selectedOrderData?.orderNumber || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>Customer:</Text>
                      <Text style={styles.printSummaryValue}>
                        {selectedOrderData?.customer || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>Site:</Text>
                      <Text style={styles.printSummaryValue}>
                        {selectedOrderData?.site || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>Date:</Text>
                      <Text style={styles.printSummaryValue}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.printSummaryDivider} />

                  <View style={styles.printSummarySection}>
                    <Text style={styles.printSummarySectionTitle}>
                      Containers
                    </Text>
                    {addedContainers.map((container, index) => (
                      <View key={container.id} style={styles.printSummaryItem}>
                        <Text style={styles.printSummaryItemText}>
                          {index + 1}. {container.containerSize} -{' '}
                          {container.streamName}
                        </Text>
                        <Text style={styles.printSummaryItemSubtext}>
                          Net Weight: {container.netWeight} lbs | Label:{' '}
                          {container.shippingLabelBarcode}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>
                        Total Containers:
                      </Text>
                      <Text style={styles.printSummaryValue}>
                        {addedContainers.length}
                      </Text>
                    </View>
                    <View style={styles.printSummaryRow}>
                      <Text style={styles.printSummaryLabel}>
                        Total Net Weight:
                      </Text>
                      <Text
                        style={[
                          styles.printSummaryValue,
                          styles.netWeightHighlight,
                        ]}>
                        {totalNetWeight} lbs
                      </Text>
                    </View>
                  </View>

                  {materialsSupplies.length > 0 && (
                    <>
                      <View style={styles.printSummaryDivider} />
                      <View style={styles.printSummarySection}>
                        <Text style={styles.printSummarySectionTitle}>
                          Materials & Supplies
                        </Text>
                        {materialsSupplies.map(material => (
                          <View
                            key={material.id}
                            style={styles.printSummaryItem}>
                            <Text style={styles.printSummaryItemText}>
                              {material.itemNumber} - {material.description}
                            </Text>
                            <Text style={styles.printSummaryItemSubtext}>
                              Qty: {material.quantity} | Type:{' '}
                              {material.type === 'used'
                                ? 'Used'
                                : 'Left Behind'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {equipmentPPE.length > 0 && (
                    <>
                      <View style={styles.printSummaryDivider} />
                      <View style={styles.printSummarySection}>
                        <Text style={styles.printSummarySectionTitle}>
                          Equipment & PPE
                        </Text>
                        {equipmentPPE.map(equipment => (
                          <View
                            key={equipment.id}
                            style={styles.printSummaryItem}>
                            <Text style={styles.printSummaryItemText}>
                              {equipment.name} - {equipment.count}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.printSummaryDivider} />

                  <View style={styles.printSummarySection}>
                    <Text style={styles.printSummarySectionTitle}>
                      Programs
                    </Text>
                    {selectedOrderData?.programs.map(program => (
                      <View key={program} style={styles.printSummaryItem}>
                        <Text style={styles.printSummaryItemText}>
                          {program}:{' '}
                          {selectedPrograms[program] || 'Not selected'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>

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
              onPress={() => {
                setShowCustomerAcknowledgment(false);
                setShowEquipmentEntry(true);
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
    }

    // Fallback (shouldn't reach here)
    return null;
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
      case 'order-service':
        return <OrderServiceScreen />;
      default:
        if (isTablet() && useMasterDetail) {
          return <DashboardScreenMasterDetail />;
        }
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {renderScreen()}
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
    marginBottom: spacing.md,
    padding: spacing.md,
    minHeight: touchTargets.comfortable * 2.5, // Ensure minimum touch target
  },
  // Compact Header
  containerSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  containerSummaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  containerSummaryNumber: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 40,
  },
  containerSummaryTitleGroup: {
    flex: 1,
  },
  containerSummaryTitle: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs / 2,
  },
  containerSummarySubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  containerSummaryNetWeight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  containerSummaryNetWeightLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  containerSummaryNetWeightValue: {
    ...typography.lg,
    fontWeight: '700',
  },
  // Compact Body
  containerSummaryBody: {
    gap: spacing.sm,
  },
  containerSummaryInfoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  containerSummaryInfoItem: {
    flex: 1,
    minHeight: touchTargets.min, // Ensure touch target
  },
  containerSummaryInfoLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  containerSummaryInfoValue: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  containerSummaryWeightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minHeight: touchTargets.comfortable,
  },
  containerSummaryWeightItem: {
    flex: 1,
    alignItems: 'center',
  },
  containerSummaryWeightDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  containerSummaryWeightLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  containerSummaryWeightValue: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
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
    marginBottom: spacing.lg,
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
    minHeight: 100,
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
    marginBottom: spacing.xs,
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
  // Bottom Sheet Delete Confirmation (Tablet-Optimized Material Design)
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  bottomSheetContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    // @ts-ignore - web-specific style
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    elevation: 16,
    maxHeight: '50%',
    minHeight: 200,
    width: '100%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  bottomSheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bottomSheetTitle: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  bottomSheetBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flex: 1,
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
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomSheetCancelButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
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
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  scannedImageText: {
    ...typography.sm,
    color: '#059669',
    textAlign: 'center',
  },
  printOptionButton: {
    marginBottom: spacing.md,
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
});

export default WasteCollectionScreen;
