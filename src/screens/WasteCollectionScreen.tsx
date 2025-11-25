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
    programs: ['Hazardous Waste', 'Universal Waste'],
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
    programs: ['Hazardous Waste'],
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
    programs: ['Hazardous Waste', 'Non-Hazardous Solid Waste'],
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
    programs: ['Universal Waste'],
    serviceDate: 'Today, 3:00 PM',
    status: 'Not Started',
  },
  {
    orderNumber: 'WO-2024-1238',
    customer: 'Costco Wholesale',
    site: 'Warehouse #234',
    city: 'Westminster',
    state: 'CO',
    programs: ['Hazardous Waste'],
    serviceDate: 'Today, 4:30 PM',
    status: 'Not Started',
  },
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
    }>
  >([]);
  const [selectedPrograms, setSelectedPrograms] = useState<
    Record<string, 'ship' | 'noship'>
  >({});
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
    const showSoftWarning = netWeight > 200 && netWeight < 350;
    const showHardWarning = netWeight > 400;
    const isCurrentOrderCompleted = selectedOrderData
      ? isOrderCompleted(selectedOrderData.orderNumber)
      : false;

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
                <CardTitleText>Container Identification</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Scan or enter barcode"
                value={barcode}
                onChangeText={setBarcode}
                editable={!isCurrentOrderCompleted}
              />
              <Button
                title="Scan"
                variant="outline"
                size="md"
                disabled={isCurrentOrderCompleted}
                onPress={() => {}}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Weight Information</CardTitleText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.weightInputsRow}>
                <View style={styles.weightInput}>
                  <Input
                    label="Tare Weight (lbs)"
                    value={tareWeight}
                    onChangeText={setTareWeight}
                    keyboardType="numeric"
                    editable={!isCurrentOrderCompleted}
                  />
                </View>
                <View style={styles.weightInput}>
                  <Input
                    label="Gross Weight (lbs)"
                    value={grossWeight}
                    onChangeText={setGrossWeight}
                    keyboardType="numeric"
                    editable={!isCurrentOrderCompleted}
                  />
                </View>
              </View>

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
                    Container is approaching maximum capacity (60% full).
                    Consider consolidation or new container.
                  </Text>
                </View>
              )}

              {showHardWarning && (
                <View style={[styles.warningCard, styles.hardWarningCard]}>
                  <Text style={[styles.warningTitle, styles.hardWarningTitle]}>
                    Hard Weight Limit Exceeded
                  </Text>
                  <Text style={styles.warningText}>
                    Container exceeds maximum weight of 400 lbs. Reduce weight
                    or select larger container.
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
            onPress={() => setCurrentStep('container-selection')}
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
                };

                setAddedContainers(prev => [...prev, newContainer]);

                // Queue for sync
                await syncService.addPendingOperation(
                  'container',
                  newContainer,
                );

                // Reset form
                setBarcode('');
                setTareWeight('45');
                setGrossWeight('285');
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
                  <CardTitleText>Select Programs for Manifest</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text style={styles.cardDescription}>
                  Choose "Ship" or "No Ship" for each program in this order
                </Text>

                {orderPrograms.length > 0 ? (
                  orderPrograms.map(program => (
                    <View key={program} style={styles.programSelectionRow}>
                      <Text style={styles.programName}>{program}</Text>
                      <View style={styles.programButtons}>
                        <Button
                          title="Ship"
                          variant={
                            selectedPrograms[program] === 'ship'
                              ? 'primary'
                              : 'outline'
                          }
                          size="sm"
                          disabled={isCurrentOrderCompleted}
                          onPress={async () => {
                            if (isCurrentOrderCompleted) return;
                            const updated = {
                              ...selectedPrograms,
                              [program]: 'ship' as const,
                            };
                            setSelectedPrograms(updated);
                            // Queue for sync
                            await syncService.addPendingOperation('manifest', {
                              orderId: selectedOrderData?.orderNumber,
                              program,
                              action: 'ship',
                            });
                          }}
                        />
                        <Button
                          title="No Ship"
                          variant={
                            selectedPrograms[program] === 'noship'
                              ? 'destructive'
                              : 'outline'
                          }
                          size="sm"
                          disabled={isCurrentOrderCompleted}
                          onPress={async () => {
                            if (isCurrentOrderCompleted) return;
                            const updated = {
                              ...selectedPrograms,
                              [program]: 'noship' as const,
                            };
                            setSelectedPrograms(updated);
                            // Queue for sync
                            await syncService.addPendingOperation('manifest', {
                              orderId: selectedOrderData?.orderNumber,
                              program,
                              action: 'noship',
                            });
                          }}
                        />
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyStateText}>
                    No programs found for this order
                  </Text>
                )}
              </CardContent>
            </Card>

            <Card style={styles.summaryCard}>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Manifest Summary</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Containers:</Text>
                  <Text style={styles.summaryValue}>
                    {addedContainers.length}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Programs to Ship:</Text>
                  <Text style={styles.summaryValue}>
                    {
                      Object.values(selectedPrograms).filter(p => p === 'ship')
                        .length
                    }{' '}
                    of {orderPrograms.length}
                  </Text>
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
                setCurrentStep('materials-supplies');
              }
            }}
          />
        </View>
      </View>
    );
  };

  const MaterialsSuppliesScreen = () => {
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
                  <CardTitleText>Materials Used</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text style={styles.cardDescription}>
                  Track materials and supplies used during service
                </Text>
                <View style={styles.materialsList}>
                  <Text style={styles.materialItem}>
                    • Personal Protective Equipment (PPE)
                  </Text>
                  <Text style={styles.materialItem}>• Cleaning Supplies</Text>
                  <Text style={styles.materialItem}>• Container Labels</Text>
                  <Text style={styles.materialItem}>• Documentation Forms</Text>
                </View>
              </CardContent>
            </Card>

            <Card style={styles.summaryCard}>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Order Information</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.customer || 'N/A'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Site:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.site || 'N/A'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service Date:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.serviceDate || 'N/A'}
                  </Text>
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
            onPress={() => setCurrentStep('manifest-management')}
          />
          <Button
            title="Continue"
            variant="primary"
            size="md"
            onPress={() => setCurrentStep('order-service')}
          />
        </View>
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
            <Text style={styles.screenHeaderSubtitle}>Service Summary</Text>
          </View>
        </View>

        <View style={styles.scrollViewContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Service Summary</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order Number:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.orderNumber || 'N/A'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.customer || 'N/A'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Site:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrderData?.site || 'N/A'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Containers:</Text>
                  <Text style={styles.summaryValue}>
                    {addedContainers.length}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Net Weight:</Text>
                  <Text
                    style={[styles.summaryValue, styles.netWeightHighlight]}>
                    {totalNetWeight} lbs
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Programs to Ship:</Text>
                  <Text style={styles.summaryValue}>
                    {programsToShip} of{' '}
                    {selectedOrderData?.programs.length || 0}
                  </Text>
                </View>
              </CardContent>
            </Card>

            <Card style={styles.summaryCard}>
              <CardHeader>
                <CardTitle>
                  <CardTitleText>Equipment & PPE</CardTitleText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text style={styles.cardDescription}>
                  Equipment and personal protective equipment used during
                  service
                </Text>
                <View style={styles.materialsList}>
                  <Text style={styles.materialItem}>• Safety Glasses</Text>
                  <Text style={styles.materialItem}>• Gloves</Text>
                  <Text style={styles.materialItem}>• Protective Suit</Text>
                  <Text style={styles.materialItem}>• Respirator</Text>
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
            onPress={() => setCurrentStep('materials-supplies')}
          />
          <Button
            title="Complete Order"
            variant="primary"
            size="md"
            onPress={async () => {
              if (selectedOrderData) {
                // Queue order completion for sync
                await syncService.addPendingOperation('order', {
                  orderNumber: selectedOrderData.orderNumber,
                  completed: true,
                  containers: addedContainers,
                  programs: selectedPrograms,
                  totalNetWeight,
                  programsToShip,
                });

                // Mark order as completed
                setCompletedOrders(prev => [
                  ...prev,
                  selectedOrderData.orderNumber,
                ]);
                // Update order status
                setOrderStatuses(prev => ({
                  ...prev,
                  [selectedOrderData.orderNumber]: 'Completed',
                }));
                // Reset state
                setAddedContainers([]);
                setSelectedPrograms({});
                setBarcode('');
                setTareWeight('45');
                setGrossWeight('285');
              }
              setCurrentStep('dashboard');
            }}
          />
        </View>
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
  programButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
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
});

export default WasteCollectionScreen;
