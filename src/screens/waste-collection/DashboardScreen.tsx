import React, {useMemo, useRef, MutableRefObject} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import {Button} from '../../components/Button';
import {Badge} from '../../components/Badge';
import {Icon} from '../../components/Icon';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../../components/Card';
import {colors} from '../../styles/theme';
import {isTablet, isLandscape, getSidebarWidth} from '../../utils/responsive';
import {formatDuration} from '../../services/timeTrackingService';
import {serviceCenterService, ServiceCenter} from '../../services/serviceCenterService';
import {serviceTypeService} from '../../services/serviceTypeService';
import {serviceTypeTimeService} from '../../services/serviceTypeTimeService';
import {SyncStatus} from '../../services/syncService';
import {OfflineStatus} from '../../services/offlineTrackingService';
import {OrderData} from '../../types/wasteCollection';
import {Screen} from '../../types/wasteCollection';
import {MOCK_ORDERS} from '../../data/mockOrders';
import {styles} from './styles';
import {DASHBOARD_INVENTORY_COLUMNS, SIMULATED_CONTAINERS_BY_ORDER_INDEX, getBusinessTypeStyle} from './constants';
import {InventoryOnTruckCell} from './InventoryOnTruckCell';

// Helper functions used locally
function formatCustomerWithStore(customer: string, site: string): string {
  const storeNum = extractStoreNumber(site);
  return storeNum ? `${customer} #${storeNum}` : customer;
}

function extractStoreNumber(site: string): string | null {
  const match = site?.match(/#(\d+)/);
  return match ? match[1] : null;
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export interface DashboardScreenProps {
  // Data
  orders: OrderData[];
  isOrderCompleted: (orderNumber: string) => boolean;
  dashboardSelectedOrder: OrderData | null;
  setDashboardSelectedOrder: (order: OrderData | null) => void;
  offlineStatus: OfflineStatus;
  username?: string;

  // Dashboard state
  dashboardStartOfDay: number | null;
  dashboardDutyElapsedMs: number;
  selectedTruck: {number: string; description?: string} | null;
  truckId: string;
  selectedTrailer: {number: string; description?: string} | null;
  dashboardRouteId: string;
  dashboardDutyStatus: string;
  serviceCenter: ServiceCenter | null;
  setShowServiceCenterModal: (show: boolean) => void;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  handleManualSync: () => void;
  setShowDropWasteModal: (show: boolean) => void;
  useMasterDetail: boolean;
  setUseMasterDetail: (use: boolean) => void;
  onLogout?: () => void;
  onNavigate?: (screen: Screen) => void;
  onGoBack?: () => void;
  activeContainerCount: number;
  currentTotalWeight: number;
  dashboardViewTab: 'orders' | 'dashboard';
  setDashboardViewTab: (tab: 'orders' | 'dashboard') => void;

  // Service list state
  dashboardServiceListExpandedOrderNumber: string | null;
  setDashboardServiceListExpandedOrderNumber: (orderNumber: string | null | ((prev: string | null) => string | null)) => void;
  completedOrdersSectionCollapsed: boolean;
  setCompletedOrdersSectionCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;

  // Header menu modal state
  showHeaderMenuModal: boolean;
  setShowHeaderMenuModal: (show: boolean) => void;

  // Notes
  setShowAllNotesModal: (show: boolean) => void;
  upcomingOrdersWithNotes: OrderData[];
  showAllNotesModal: boolean;

  // Order status helpers
  getOrderStatus: (order: OrderData) => string;
  hasOrderNotes: (order: OrderData) => boolean;
  isOrderReadyForManifest: (order: OrderData) => boolean;
  hasManifestForOrder: (orderNumber: string) => boolean;
  handleGenerateManifestForOrder: (order: OrderData) => void;
  voidManifest: () => void;

  // Service type
  isServiceTypeNoShip: (orderNumber: string, serviceTypeId: string) => boolean;
  setNoShipForServiceType: (orderNumber: string, serviceTypeId: string, data: any) => void;
  clearNoShipForServiceType: (orderNumber: string, serviceTypeId: string) => void;
  handleDashboardServiceTypeBadgePress: (order: OrderData, program: string, pending: boolean, noship: boolean) => void;
  activeServiceTypeTimer: string | null;
  setCompletedOrders: (orders: string[] | ((prev: string[]) => string[])) => void;
  setSelectedServiceTypeToStart: (serviceType: string | null) => void;
  handlePhoneCall: (phone: string) => void;
  handleEmail: (email: string) => void;
  selectedOrderData: OrderData | null;
  orderStatuses: Record<string, string>;

  // No-ship reason state
  noShipReasonOrderNumber: string | null;
  noShipReasonServiceTypeId: string | null;
  noShipReasonCode: string;
  noShipReasonNotes: string;
  setNoShipReasonOrderNumber: (orderNumber: string | null) => void;
  setNoShipReasonServiceTypeId: (serviceTypeId: string | null) => void;
  setNoShipReasonCode: (code: any) => void;
  setNoShipReasonNotes: (notes: string) => void;

  // Inventory
  dashboardInventorySummary: Record<string, number>;
  inventorySaveGeneration: number;
  inventoryCustomersExpanded: boolean;
  setInventoryCustomersExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  inventorySaveStatus: string;
  saveInventorySummary: () => void;
  inventoryDraftRef: MutableRefObject<Record<string, number>>;
  dashboardScrollRef: MutableRefObject<ScrollView | null>;
  dashboardScrollYRef: MutableRefObject<number>;
}

export function renderDashboardTabContent(
  activeOrders: OrderData[],
  props: DashboardScreenProps,
) {
  const {
    dashboardScrollRef,
    dashboardScrollYRef,
    inventorySaveStatus,
    saveInventorySummary,
    dashboardInventorySummary,
    inventorySaveGeneration,
    inventoryDraftRef,
    inventoryCustomersExpanded,
    setInventoryCustomersExpanded,
    dashboardServiceListExpandedOrderNumber,
    setDashboardServiceListExpandedOrderNumber,
  } = props;

  // Per-customer containers needed for the route: simulated only (no longer from captured containers).
  const projectedByOrder = activeOrders.reduce<Record<string, Record<string, number>>>(
    (acc, order) => {
      const perColumn: Record<string, number> = {};
      DASHBOARD_INVENTORY_COLUMNS.forEach(col => {
        perColumn[col] = 0;
      });
      acc[order.orderNumber] = perColumn;
      return acc;
    },
    {},
  );

  activeOrders.forEach((order, idx) => {
    const simulated = SIMULATED_CONTAINERS_BY_ORDER_INDEX[idx % SIMULATED_CONTAINERS_BY_ORDER_INDEX.length];
    if (!simulated || !(order.orderNumber in projectedByOrder)) return;
    DASHBOARD_INVENTORY_COLUMNS.forEach(col => {
      const need = simulated[col] ?? 0;
      projectedByOrder[order.orderNumber][col] = need;
    });
  });

  const projectedTotals: Record<string, number> = {};
  DASHBOARD_INVENTORY_COLUMNS.forEach(col => {
    projectedTotals[col] = activeOrders.reduce(
      (sum, order) => sum + (projectedByOrder[order.orderNumber]?.[col] ?? 0),
      0,
    );
  });

  return (
    <View style={styles.dashboardContentRow}>
      <ScrollView
        ref={dashboardScrollRef}
        style={styles.dashboardRightScroll}
        contentContainerStyle={styles.dashboardRightContent}
        showsVerticalScrollIndicator={true}
        onScroll={(event) => {
          dashboardScrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.dashboardSectionCard}>
          <CardHeader>
            <View style={styles.dashboardCardHeaderRow}>
              <CardTitle style={styles.dashboardCardTitle}>
                <CardTitleText>Inventory check</CardTitleText>
              </CardTitle>
              <View style={[styles.dashboardInventoryActions, styles.dashboardInventoryActionsInHeader]}>
                <Button
                  title={inventorySaveStatus === 'saving' ? 'Saving...' : inventorySaveStatus === 'saved' ? 'Saved' : 'Save Truck Inventory'}
                  onPress={saveInventorySummary}
                  variant="primary"
                  size="sm"
                  disabled={inventorySaveStatus === 'saving'}
                  loading={inventorySaveStatus === 'saving'}
                />
                {inventorySaveStatus === 'saved' && (
                  <Text style={styles.dashboardInventorySavedText}>Saved.</Text>
                )}
              </View>
            </View>
            <Text style={styles.dashboardSectionNote}>Based on prior service data for each customer</Text>
          </CardHeader>
          <CardContent>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.dashboardTableScrollContent}>
              <View style={[styles.dashboardTable, styles.dashboardTableInHorizontalScroll]}>
                <View style={styles.dashboardTableHeaderRow}>
                  <Text style={[styles.dashboardTableHeaderCell, styles.dashboardTableColCustomer]}>&nbsp;</Text>
                  {DASHBOARD_INVENTORY_COLUMNS.map(col => (
                    <Text
                      key={col}
                      style={[
                        styles.dashboardTableHeaderCell,
                        styles.dashboardTableInventoryCell,
                        col === 'Other' && styles.dashboardTableOtherInventoryCell,
                        styles.dashboardTableInventoryHeaderText,
                      ]}>
                      {col}
                    </Text>
                  ))}
                </View>
                <View style={[styles.dashboardTableRow, styles.dashboardInventoryEditableRow]}>
                  <Text style={[styles.dashboardTableCell, styles.dashboardTableColCustomer, styles.dashboardTableTotalLabel]}>
                    Supplies Loaded
                  </Text>
                  {DASHBOARD_INVENTORY_COLUMNS.map(col => (
                    <InventoryOnTruckCell
                      key={col}
                      columnKey={col}
                      committedValue={dashboardInventorySummary[col] ?? 0}
                      saveGeneration={inventorySaveGeneration}
                      onDraftChange={(key, value) => {
                        inventoryDraftRef.current[key] = value;
                      }}
                      cellStyle={[
                        styles.dashboardTableCell,
                        styles.dashboardTableInventoryCell,
                        styles.dashboardInventoryCurrentCell,
                      ]}
                      inputStyle={styles.dashboardInventoryInput}
                      otherCellStyle={styles.dashboardTableOtherInventoryCell}
                      placeholderTextColor={colors.mutedForeground}
                    />
                  ))}
                </View>
              <View style={[styles.dashboardTableRow, styles.dashboardTableTotalRow]}>
                <Text style={[styles.dashboardTableCell, styles.dashboardTableColCustomer, styles.dashboardTableTotalLabel]}>Supplies Needed</Text>
                {DASHBOARD_INVENTORY_COLUMNS.map(col => (
                  <Text
                    key={col}
                    style={[
                      styles.dashboardTableCell,
                      styles.dashboardTableInventoryCell,
                      col === 'Other' && styles.dashboardTableOtherInventoryCell,
                    ]}>
                    {String(projectedTotals[col] ?? 0)}
                  </Text>
                ))}
              </View>
              <View style={[styles.dashboardTableRow, styles.dashboardTableRemainingRow]}>
                <Text style={[styles.dashboardTableCell, styles.dashboardTableColCustomer, styles.dashboardTableTotalLabel]}>Supplies Delta</Text>
                {DASHBOARD_INVENTORY_COLUMNS.map(col => {
                  const onTruck = dashboardInventorySummary[col] ?? 0; // committed (saved) counts only; draft updates after Save
                  const needed = projectedTotals[col] ?? 0;
                  const afterRoute = onTruck - needed;
                  return (
                    <Text
                      key={col}
                      style={[
                        styles.dashboardTableCell,
                        styles.dashboardTableInventoryCell,
                        col === 'Other' && styles.dashboardTableOtherInventoryCell,
                        afterRoute < 0 && styles.dashboardTableRemainingNegative,
                        afterRoute > 0 && styles.dashboardTableRemainingPositive,
                      ]}>
                      {afterRoute < 0 ? `Short ${Math.abs(afterRoute)}` : afterRoute}
                    </Text>
                  );
                })}
              </View>
              {(inventoryCustomersExpanded ? activeOrders : activeOrders.slice(0, 3)).map(order => (
                <View key={order.orderNumber} style={styles.dashboardTableRow}>
                  <Text style={[styles.dashboardTableCell, styles.dashboardTableColCustomer]} numberOfLines={1}>{order.customer}</Text>
                  {DASHBOARD_INVENTORY_COLUMNS.map(col => (
                    <Text
                      key={col}
                      style={[
                        styles.dashboardTableCell,
                        styles.dashboardTableInventoryCell,
                        col === 'Other' && styles.dashboardTableOtherInventoryCell,
                      ]}>
                      {String(projectedByOrder[order.orderNumber]?.[col] ?? 0)}
                    </Text>
                  ))}
                </View>
              ))}
              {activeOrders.length > 3 && (
                <TouchableOpacity
                  onPress={() => setInventoryCustomersExpanded(prev => !prev)}
                  activeOpacity={0.7}
                  style={styles.inventoryExpandRow}>
                  <Text style={styles.inventoryExpandText}>
                    {inventoryCustomersExpanded ? 'Show less' : `Show all ${activeOrders.length} customers`}
                  </Text>
                </TouchableOpacity>
              )}
                </View>
            </ScrollView>
          </CardContent>
        </Card>
        <Card style={styles.dashboardSectionCard}>
          <CardHeader style={styles.dashboardCardHeaderRow}>
            <CardTitle style={styles.dashboardCardTitle}>
              <CardTitleText>Service List</CardTitleText>
            </CardTitle>
            <Text style={styles.dashboardSectionBadge}>Routes: {activeOrders.length}</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.serviceListCardList}>
              {activeOrders.map((order, idx) => {
                const typeStyle = getBusinessTypeStyle(order.orderType);
                const typeLabel = typeStyle.label;
                const isExpanded = dashboardServiceListExpandedOrderNumber === order.orderNumber;
                const hasNotes = Boolean(
                  order.generatorStatus ||
                  order.siteAccessNotes ||
                  (order.previousServiceNotes && order.previousServiceNotes.length > 0) ||
                  order.customerSpecialInstructions,
                );
                return (
                  <View key={order.orderNumber} style={styles.serviceListCardWrapper}>
                    <TouchableOpacity
                        style={[styles.serviceListCard, isExpanded && styles.serviceListCardDetailsBlockNotesOpen]}
                      onPress={() => setDashboardServiceListExpandedOrderNumber(prev => prev === order.orderNumber ? null : order.orderNumber)}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={`${order.customer}, ${order.city} ${order.state}. ${isExpanded ? 'Collapse' : 'Expand'} notes`}
                      accessibilityState={{expanded: isExpanded}}>
                      <View style={styles.serviceListCardHeader}>
                        <Text style={styles.serviceListCardNum}>{idx + 1}</Text>
                        <Text style={styles.serviceListCardCustomer} numberOfLines={2}>{order.customer}</Text>
                        <View style={[styles.dashboardBusinessTypeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
                          <Text style={[styles.dashboardBusinessTypeBadgeText, { color: typeStyle.text }]} numberOfLines={1}>{typeLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.serviceListCardLocation} numberOfLines={1}>{order.city}, {order.state}</Text>
                      <View style={styles.serviceListCardDetailsBlock}>
                        <View style={styles.serviceListCardGrid}>
                          <View style={styles.serviceListCardGridRowWithNotes}>
                            <View style={styles.serviceListCardGridRow}>
                            <View style={styles.serviceListCardField}>
                              <Text style={styles.serviceListCardFieldLabel}>Planned arrival</Text>
                              <Text style={styles.serviceListCardFieldValue} numberOfLines={1}>{order.plannedArrival ?? '—'}</Text>
                            </View>
                            <View style={styles.serviceListCardField}>
                              <Text style={styles.serviceListCardFieldLabel}>Actual arrival</Text>
                              <Text style={styles.serviceListCardFieldValue} numberOfLines={1}>{order.actualArrival ?? '—'}</Text>
                            </View>
                            <View style={styles.serviceListCardField}>
                              <Text style={styles.serviceListCardFieldLabel}>Planned duration</Text>
                              <Text style={styles.serviceListCardFieldValue} numberOfLines={1}>
                                {order.plannedDurationMinutes != null ? `${order.plannedDurationMinutes} min` : '—'}
                              </Text>
                            </View>
                            <View style={styles.serviceListCardField}>
                              <Text style={styles.serviceListCardFieldLabel}>Actual duration</Text>
                              <Text style={styles.serviceListCardFieldValue} numberOfLines={1}>
                                {order.actualDurationMinutes != null ? `${order.actualDurationMinutes} min` : '—'}
                              </Text>
                            </View>
                            <View style={styles.serviceListCardField}>
                              <Text style={styles.serviceListCardFieldLabel}>Pace</Text>
                              <Text style={styles.serviceListCardFieldValue} numberOfLines={1}>{order.pace ?? '—'}</Text>
                            </View>
                          </View>
                            {hasNotes && (
                              <Text style={styles.serviceListCardNotesLink}>
                                {isExpanded ? 'Hide notes' : 'View notes'}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                    </TouchableOpacity>
                    {isExpanded && hasNotes && (
                      <View style={styles.serviceListExpanded}>
                        {order.generatorStatus && (
                          <View style={styles.serviceListExpandedBlock}>
                            <Text style={styles.serviceListExpandedLabel}>Generator notes</Text>
                            <Text style={styles.serviceListExpandedValue}>
                              {order.generatorStatus}{order.epaId ? '. EPA ID: Yes' : ''}
                            </Text>
                          </View>
                        )}
                        {order.siteAccessNotes && (
                          <View style={styles.serviceListExpandedBlock}>
                            <Text style={styles.serviceListExpandedLabel}>Site notes</Text>
                            <Text style={styles.serviceListExpandedValue}>{order.siteAccessNotes}</Text>
                          </View>
                        )}
                        {order.previousServiceNotes && order.previousServiceNotes.length > 0 && (
                          <View style={styles.serviceListExpandedBlock}>
                            <Text style={styles.serviceListExpandedLabel}>Technician notes</Text>
                            <Text style={styles.serviceListExpandedValue}>
                              {order.previousServiceNotes.map(n => `${n.note} (${n.technician || n.date})`).join('. ')}
                            </Text>
                          </View>
                        )}
                        {order.customerSpecialInstructions && (
                          <View style={styles.serviceListExpandedBlock}>
                            <Text style={styles.serviceListExpandedLabel}>Job sheet notes</Text>
                            <Text style={styles.serviceListExpandedValue}>{order.customerSpecialInstructions}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}

// Master-Detail Dashboard Screen (for tablets)
export const DashboardScreenMasterDetail = (props: DashboardScreenProps) => {
  const {
    orders,
    isOrderCompleted,
    dashboardSelectedOrder,
    setDashboardSelectedOrder,
    offlineStatus,
    username,
    dashboardStartOfDay,
    dashboardDutyElapsedMs,
    selectedTruck,
    truckId,
    selectedTrailer,
    dashboardRouteId,
    dashboardDutyStatus,
    serviceCenter,
    setShowServiceCenterModal,
    syncStatus,
    pendingSyncCount,
    handleManualSync,
    setShowDropWasteModal,
    setUseMasterDetail,
    onLogout,
    onNavigate,
    activeContainerCount,
    currentTotalWeight,
    dashboardViewTab,
    setDashboardViewTab,
    completedOrdersSectionCollapsed,
    setCompletedOrdersSectionCollapsed,
    upcomingOrdersWithNotes,
    setShowAllNotesModal,
    getOrderStatus,
    hasOrderNotes,
    isOrderReadyForManifest,
    hasManifestForOrder,
    handleGenerateManifestForOrder,
    voidManifest,
    isServiceTypeNoShip,
    handleDashboardServiceTypeBadgePress,
    activeServiceTypeTimer,
    setCompletedOrders,
    setSelectedServiceTypeToStart,
    handlePhoneCall,
    handleEmail,
  } = props;

  const allOrders = MOCK_ORDERS || orders || [];
  const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
  const completedOrdersList = allOrders.filter(order => isOrderCompleted(order.orderNumber));
  const selectedOrder = dashboardSelectedOrder || activeOrders[0] || completedOrdersList[0] || null;
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

  const dashboardDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerContent}
            onPress={() => onNavigate?.('Settings')}
            activeOpacity={0.7}>
            <Text style={styles.dashboardWelcomeTitle}>
              {username ? `Welcome, ${username}` : 'Welcome'}
            </Text>
            <View style={styles.dashboardHeaderBar}>
              <View style={styles.dashboardHeaderItem}>
                <Text style={styles.dashboardHeaderItemLabel}>Truck</Text>
                <Text style={styles.dashboardHeaderItemValue} numberOfLines={1}>
                  {selectedTruck ? selectedTruck.number : truckId || '—'}
                </Text>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View style={styles.dashboardHeaderItem}>
                <Text style={styles.dashboardHeaderItemLabel}>Trailer</Text>
                <Text style={styles.dashboardHeaderItemValue} numberOfLines={1}>
                  {selectedTrailer ? selectedTrailer.number : '—'}
                </Text>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View style={styles.dashboardHeaderDivider} />
              <View style={styles.dashboardHeaderItem}>
                <Text style={styles.dashboardHeaderItemLabel}>Route</Text>
                <Text style={styles.dashboardHeaderItemValue} numberOfLines={1}>
                  {dashboardRouteId || '—'}
                </Text>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View style={styles.dashboardHeaderItem}>
                <Text style={styles.dashboardHeaderItemLabel}>Start of day</Text>
                <Text style={styles.dashboardHeaderItemValue} numberOfLines={1}>
                  {dashboardStartOfDay ? serviceTypeTimeService.formatTime(dashboardStartOfDay) : '—'}
                </Text>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View style={styles.dashboardHeaderItem}>
                <Text style={styles.dashboardHeaderItemLabel}>Time on duty</Text>
                <Text style={styles.dashboardHeaderItemValue} numberOfLines={1}>
                  {formatDuration(dashboardDutyElapsedMs)}
                </Text>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View style={[styles.dashboardHeaderItem, styles.dashboardHeaderItemStatus]}>
                <Text style={styles.dashboardHeaderItemLabel}>Status</Text>
                <View style={[styles.dashboardHeaderStatusBadge, dashboardDutyStatus === 'On duty' && styles.dashboardHeaderStatusBadgeActive]}>
                  <Text style={[styles.dashboardHeaderStatusText, dashboardDutyStatus === 'On duty' && styles.dashboardHeaderStatusTextActive]} numberOfLines={1}>
                    {dashboardDutyStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.dashboardHeaderDivider} />
              <View>
                {serviceCenter && (
                  <View style={styles.dashboardHeaderServiceCenterWrap}>
                    <TouchableOpacity
                      style={styles.serviceCenterBadge}
                      activeOpacity={0.7}>
                      <Icon name="business" size={16} color={colors.primary} />
                      <Text style={styles.serviceCenterText} numberOfLines={1}>
                        {serviceCenterService.getDisplayFormat(false)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
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

      <View style={styles.dashboardTabBar}>
        <View style={styles.dashboardTabGroup}>
          <TouchableOpacity
            style={[styles.dashboardTab, dashboardViewTab === 'dashboard' && styles.dashboardTabActive]}
            onPress={() => setDashboardViewTab('dashboard')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{selected: dashboardViewTab === 'dashboard'}}>
            <Text style={[styles.dashboardTabText, dashboardViewTab === 'dashboard' && styles.dashboardTabTextActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dashboardTab, dashboardViewTab === 'orders' && styles.dashboardTabActive]}
            onPress={() => setDashboardViewTab('orders')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{selected: dashboardViewTab === 'orders'}}>
            <Text style={[styles.dashboardTabText, dashboardViewTab === 'orders' && styles.dashboardTabTextActive]}>Upcoming Orders</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dashboardTabDateLabel} numberOfLines={1}>
          {dashboardDate}
        </Text>
      </View>

      {dashboardViewTab === 'dashboard' ? (
        renderDashboardTabContent(activeOrders, props)
      ) : (
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
              {activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} remaining
            </Text>
          </View>
          <ScrollView
            style={styles.masterPaneScroll}
            contentContainerStyle={styles.masterPaneContent}>
            {activeOrders.length > 0 ? (
              activeOrders.map((order, index) => (
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
                          {getBusinessTypeStyle(order.orderType).label}
                        </Badge>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              completedOrdersList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No Orders Scheduled
                  </Text>
                  <Text style={styles.emptyStateText}>
                    You have no orders scheduled for today.
                  </Text>
                </View>
              ) : null
            )}
            {/* Completed Orders Section - collapsed at bottom (master-detail) */}
            {completedOrdersList.length > 0 && (
              <View style={styles.completedOrdersSection}>
                <TouchableOpacity
                  style={styles.completedOrdersHeaderRow}
                  onPress={() => setCompletedOrdersSectionCollapsed(prev => !prev)}
                  activeOpacity={0.7}>
                  <View style={styles.completedOrdersTitleRow}>
                    <Icon name="check-circle" size={18} color={colors.success} style={styles.completedOrdersIcon} />
                    <Text style={styles.completedOrdersTitle}>
                      Completed ({completedOrdersList.length})
                    </Text>
                    <Icon
                      name={completedOrdersSectionCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
                      size={24}
                      color={colors.mutedForeground}
                    />
                  </View>
                </TouchableOpacity>
                {!completedOrdersSectionCollapsed &&
                  completedOrdersList.map((order, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.completedOrderCard}
                      onPress={() => setDashboardSelectedOrder(order)}
                      activeOpacity={0.7}>
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
                          <Icon name="check-circle" size={20} color={colors.success} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Detail Pane - Order Details */}
        <View style={styles.detailPane}>
          {selectedOrder ? (
            <ScrollView
              style={styles.detailPaneScroll}
              contentContainerStyle={styles.detailPaneContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.detailPaneHeader}>
                <Text style={styles.detailPaneTitle} numberOfLines={1}>
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
                        {getBusinessTypeStyle(selectedOrder.orderType).label}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.detailRow, styles.programsDetailRow]}>
                    <Text style={styles.detailLabel}>Service Types:</Text>
                    <View style={styles.programsContainerInline}>
                      {selectedOrder.programs.map((program, i) => {
                        const serviceOrderNumber = selectedOrder.serviceOrderNumbers?.[program];
                        const noship = isServiceTypeNoShip(selectedOrder.orderNumber, program);
                        const entry = serviceTypeTimeService.getTimeEntry(selectedOrder.orderNumber, program);
                        const hasStart = entry?.startTime != null;
                        const hasEnd = entry?.endTime != null;
                        const inProgress = activeServiceTypeTimer === program;
                        const completed = !noship && hasStart && hasEnd;
                        const pending = !noship && !completed && !inProgress;
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
                        const chevronColor = noship
                          ? colors.mutedForeground
                          : completed
                            ? colors.success
                            : inProgress
                              ? colors.info
                              : colors.warning;
                        const canEditOrder = !isSelectedOrderCompleted;
                        return (
                          <Pressable
                            key={i}
                            onPress={() => {
                              if (canEditOrder && selectedOrder) {
                                handleDashboardServiceTypeBadgePress(
                                  selectedOrder,
                                  program,
                                  pending,
                                  noship,
                                );
                              }
                            }}
                            disabled={!canEditOrder}
                            style={({ pressed }) => [
                              canEditOrder && pressed && { opacity: 0.7 },
                              !canEditOrder && { opacity: 1 },
                            ]}
                            hitSlop={8}>
                            <Badge
                              variant="outline"
                              style={StyleSheet.flatten(badgeStyle)}
                              textStyle={textStyle}
                              title={serviceTypeService.getServiceTypeName(program)}
                              trailingIcon={
                                <Icon name="chevron-right" size={20} color={chevronColor} />
                              }>
                              {serviceOrderNumber
                                ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                                : serviceTypeService.formatForBadge(program)}
                            </Badge>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={[styles.detailActionsRow]}>
                    {isSelectedOrderCompleted ? (
                      <Text style={styles.detailActionsOrderCompletedText}>
                        Order completed
                      </Text>
                    ) : (
                      <>
                        {isOrderReadyForManifest(selectedOrder) && (
                          <>
                            <Button
                              title={hasManifestForOrder(selectedOrder.orderNumber) ? 'Open manifest' : 'Continue to manifest'}
                              variant="primary"
                              size="lg"
                              style={styles.detailActionsRowButton}
                              onPress={() => {
                                if (selectedOrder) {
                                  handleGenerateManifestForOrder(selectedOrder);
                                }
                              }}
                            />
                            {hasManifestForOrder(selectedOrder.orderNumber) && (
                              <Button
                                title="Void manifest"
                                variant="destructive"
                                size="lg"
                                style={styles.detailActionsRowButton}
                                onPress={voidManifest}
                              />
                            )}
                          </>
                        )}
                        {selectedOrder.programs.every((p) =>
                          isServiceTypeNoShip(selectedOrder.orderNumber, p),
                        ) ? (
                          <Button
                            title="Complete Order as No-Ship"
                            variant="primary"
                            size="lg"
                            style={styles.detailActionsRowButton}
                            onPress={() => {
                              if (!selectedOrder) return;
                              setCompletedOrders((prev) =>
                                prev.includes(selectedOrder.orderNumber)
                                  ? prev
                                  : [...prev, selectedOrder.orderNumber],
                              );
                              setSelectedServiceTypeToStart(null);
                            }}
                          />
                        ) : (
                          null
                        )}
                      </>
                    )}
                  </View>
                </CardContent>
              </Card>

              <View style={styles.detailNotesSection}>
                <View style={styles.detailNotesHeader}>
                  <Text style={styles.detailNotesTitle}>Service Notes</Text>
                  {hasDetailNotes && (
                    <Badge variant="secondary">
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
                {isSelectedOrderCompleted ? (
                  <Button
                    title="Order Completed"
                    variant="primary"
                    size="lg"
                    disabled
                    onPress={() => {}}
                  />
                ) : (
                  <>
                    {/* <Text style={styles.detailLabel}>Service types</Text>
                    <View style={styles.serviceTypeSelectionInlineList}>
                      {selectedOrder.programs.map((serviceTypeId) => {
                        const order = selectedOrder;
                        const timeEntry = serviceTypeTimeEntries.get(serviceTypeId);
                        const hasStartTime = timeEntry != null && timeEntry.startTime != null;
                        const hasEndTime = timeEntry != null && timeEntry.endTime != null;
                        const isNoShip = isServiceTypeNoShip(order.orderNumber, serviceTypeId);
                        const isSelected = selectedServiceTypeToStart === serviceTypeId;
                        const isSelectable = !isNoShip && !(hasStartTime && hasEndTime);
                        const isInProgress = activeServiceTypeTimer === serviceTypeId;
                        const isCompleted = !isNoShip && hasStartTime && hasEndTime;
                        const isPending = !isNoShip && !isCompleted && !isInProgress;
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
                                <Text style={styles.serviceTypeSelectionNoShipLabel} numberOfLines={1}>
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
                    </View>
                    {noShipReasonServiceTypeId != null &&
                      noShipReasonOrderNumber === selectedOrder.orderNumber && (
                      <View style={styles.noShipReasonInlinePanel}>
                        <Text style={styles.noShipReasonInlineTitle}>Select No-Ship Reason</Text>
                        <Text style={styles.serviceTypeSelectionModalDescription}>
                          Required for audit and billing. Choose a reason code (Rule 52).
                        </Text>
                        <ScrollView
                          style={styles.noShipReasonInlineList}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled>
                          {(Object.keys(NO_SHIP_REASON_CODES) as NoShipReasonCode[]).map((code) => (
                            <TouchableOpacity
                              key={code}
                              style={[
                                styles.noShipReasonRow,
                                noShipReasonCode === code && styles.noShipReasonRowSelected,
                              ]}
                              onPress={() => setNoShipReasonCode(code)}>
                              <Text style={styles.noShipReasonCode}>{code}</Text>
                              <Text style={styles.noShipReasonLabel}>{getNoShipReasonLabel(code)}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {isOtherReason(noShipReasonCode) && (
                          <View style={styles.noShipReasonNotesSection}>
                            <Text style={styles.noShipReasonNotesLabel}>
                              Notes (required, min {MIN_OTHER_NOTES_LENGTH} characters)
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
                                noShipReasonNotes.trim().length < MIN_OTHER_NOTES_LENGTH)
                            }
                            onPress={() => {
                              if (!noShipReasonOrderNumber || !noShipReasonServiceTypeId) return;
                              if (!noShipReasonCode) return;
                              if (
                                isOtherReason(noShipReasonCode) &&
                                noShipReasonNotes.trim().length < MIN_OTHER_NOTES_LENGTH
                              )
                                return;
                              setNoShipForServiceType(noShipReasonOrderNumber, noShipReasonServiceTypeId, {
                                reasonCode: noShipReasonCode as NoShipReasonCode,
                                ...(isOtherReason(noShipReasonCode)
                                  ? {notes: noShipReasonNotes.trim()}
                                  : {}),
                              });
                              setNoShipReasonOrderNumber(null);
                              setNoShipReasonServiceTypeId(null);
                              setNoShipReasonCode('');
                              setNoShipReasonNotes('');
                            }}
                          />
                        </View>
                      </View>
                    )}
                    {selectedOrder.programs.every((p) =>
                      isServiceTypeNoShip(selectedOrder.orderNumber, p),
                    ) && (
                      <View style={styles.serviceTypeSelectionModalAllNoShipBanner}>
                        <Text style={styles.serviceTypeSelectionModalAllNoShipText}>
                          All service types are No-Ship. Complete order as No-Ship (Rule 51).
                        </Text>
                      </View>
                    )} */}
                  </>
                )}
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
      )}
    </View>
  );
};

// Standard Full-Screen Dashboard Screen (original)
export const DashboardScreen = (props: DashboardScreenProps) => {
  const {
    orders,
    isOrderCompleted,
    dashboardSelectedOrder,
    setDashboardSelectedOrder,
    offlineStatus,
    username,
    dashboardStartOfDay,
    dashboardDutyElapsedMs,
    selectedTruck,
    truckId,
    selectedTrailer,
    dashboardRouteId,
    dashboardDutyStatus,
    serviceCenter,
    setShowServiceCenterModal,
    syncStatus,
    pendingSyncCount,
    handleManualSync,
    setShowDropWasteModal,
    setUseMasterDetail,
    onLogout,
    onNavigate,
    onGoBack,
    activeContainerCount,
    currentTotalWeight,
    dashboardViewTab,
    setDashboardViewTab,
    completedOrdersSectionCollapsed,
    setCompletedOrdersSectionCollapsed,
    showHeaderMenuModal,
    setShowHeaderMenuModal,
    upcomingOrdersWithNotes,
    setShowAllNotesModal,
    getOrderStatus,
    hasOrderNotes,
    isOrderReadyForManifest,
    hasManifestForOrder,
    handleGenerateManifestForOrder,
    voidManifest,
    isServiceTypeNoShip,
    handleDashboardServiceTypeBadgePress,
    activeServiceTypeTimer,
    setCompletedOrders,
    setSelectedServiceTypeToStart,
    handlePhoneCall,
    handleEmail,
    selectedOrderData,
  } = props;

  // Use MOCK_ORDERS directly to ensure it's accessible
  const allOrders = MOCK_ORDERS || orders || [];
  // Split orders into active and completed
  const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
  const completedOrdersList = allOrders.filter(order => isOrderCompleted(order.orderNumber));
  const dashboardDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);
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
      <View style={styles.headerCompact}>
        <View style={styles.headerCompactLeft}>
          {/* <TouchableOpacity
            style={styles.headerCompactDashboard}
            onPress={() => setDashboardViewTab('dashboard')}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityLabel="Dashboard tab"
            accessibilityRole="button">
            <Icon name="home" size={22} color={colors.primary} />
            <Text style={styles.headerCompactDashboardText}>Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.headerCompactTitle} numberOfLines={1}>
            Upcoming Orders
          </Text> */}

          <TouchableOpacity
            style={styles.headerCompactUser}
            onPress={() => onNavigate?.('Settings')}
            activeOpacity={0.7}
            hitSlop={8}>
            <View style={styles.dashboardHeaderCompactMeta}>
              <View style={styles.dashboardHeaderCompactRow}>
                <Text style={styles.dashboardHeaderCompactName} numberOfLines={1}>
                  {username || 'User'}
                </Text>
                <View style={[styles.dashboardHeaderCompactStatusBadge, dashboardDutyStatus === 'On duty' && styles.dashboardHeaderStatusBadgeActive]}>
                  <Text style={[styles.dashboardHeaderCompactStatusText, dashboardDutyStatus === 'On duty' && styles.dashboardHeaderStatusTextActive]} numberOfLines={1}>
                    {dashboardDutyStatus}
                  </Text>
                </View>
              </View>
              <Text style={styles.dashboardHeaderCompactDetail} numberOfLines={2}>
                {selectedTruck ? selectedTruck.number : truckId || '—'}
                {'  ·  '}
                {selectedTrailer ? selectedTrailer.number : '—'}
                {dashboardRouteId ? `  ·  ${dashboardRouteId}` : ''}
                {'  ·  '}
                {dashboardStartOfDay
                  ? `Start ${serviceTypeTimeService.formatTime(dashboardStartOfDay)} • Time on duty ${formatDuration(
                      dashboardDutyElapsedMs,
                    )}`
                  : `Time on duty ${formatDuration(dashboardDutyElapsedMs)}`}
                {serviceCenter && `  ·  ${serviceCenterService.getDisplayFormat(false)}`}
              </Text>

            </View>
          </TouchableOpacity>
          {getOfflineLimitMessage()}
        </View>
        <View style={styles.headerCompactActions}>
          {activeContainerCount > 0 ? (
            <Button
              title="Drop"
              variant="primary"
              size="sm"
              onPress={() => setShowDropWasteModal(true)}
            />
          ) : (
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
          )}
          <TouchableOpacity
            style={styles.headerMoreButton}
            onPress={() => setShowHeaderMenuModal(true)}
            hitSlop={8}
            activeOpacity={0.7}>
            <Icon name="more-vert" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Header "More" menu — progressive disclosure for Sync, View Notes, Master-Detail, Back */}
      <Modal
        visible={showHeaderMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenuModal(false)}>
        <View style={styles.headerMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowHeaderMenuModal(false)}
          />
          <View style={styles.headerMenuCard} pointerEvents="box-none">
            {activeContainerCount > 0 && (
              <TouchableOpacity
                style={styles.headerMenuItem}
                onPress={() => {
                  setShowHeaderMenuModal(false);
                  setShowAllNotesModal(true);
                }}
                activeOpacity={0.7}>
                <Text style={styles.headerMenuItemText}>
                  {upcomingOrdersWithNotes.length > 0
                    ? `View Notes (${upcomingOrdersWithNotes.length})`
                    : 'View Notes'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setShowHeaderMenuModal(false);
                if (!(syncStatus === 'syncing' || !offlineStatus.isOnline)) {
                  handleManualSync();
                }
              }}
              disabled={syncStatus === 'syncing' || !offlineStatus.isOnline}
              activeOpacity={0.7}>
              <Text style={styles.headerMenuItemText}>
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
              </Text>
              {syncStatus !== 'syncing' && (
                <View
                  style={[
                    styles.syncDot,
                    (syncStatus === 'synced' || syncStatus === 'pending') && styles.syncDotSynced,
                    (syncStatus === 'error' || syncStatus === 'offline' || !offlineStatus.isOnline) && styles.syncDotError,
                  ]}
                />
              )}
            </TouchableOpacity>
            {serviceCenter && (
              <TouchableOpacity
                style={styles.headerMenuItem}
                onPress={() => {
                  setShowHeaderMenuModal(false);
                  setShowServiceCenterModal(true);
                }}
                activeOpacity={0.7}>
                <Text style={styles.headerMenuItemText} numberOfLines={1}>
                  {serviceCenterService.getDisplayFormat(false)}
                </Text>
              </TouchableOpacity>
            )}
            {isTablet() && isLandscape() && (
              <TouchableOpacity
                style={styles.headerMenuItem}
                onPress={() => {
                  setShowHeaderMenuModal(false);
                  const allOrders = MOCK_ORDERS || orders || [];
                  const activeOrders = allOrders.filter(order => !isOrderCompleted(order.orderNumber));
                  if (activeOrders.length > 0 && !dashboardSelectedOrder) {
                    setDashboardSelectedOrder(activeOrders[0]);
                  }
                  setUseMasterDetail(true);
                }}
                activeOpacity={0.7}>
                <Text style={styles.headerMenuItemText}>Master-Detail</Text>
              </TouchableOpacity>
            )}
            {(onGoBack || onNavigate) && (
              <TouchableOpacity
                style={styles.headerMenuItem}
                onPress={() => {
                  setShowHeaderMenuModal(false);
                  setDashboardViewTab('dashboard');
                }}
                activeOpacity={0.7}>
                <Text style={styles.headerMenuItemText}>Back to Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* FR-3a.EXT.3.3: Running total — current total weight and container count (active only); resets to 0 when all dropped */}
      <View style={styles.runningTotalRow}>
        <Text style={styles.runningTotalLabel}>Running total:</Text>
        <Text style={styles.runningTotalValue}>
          {activeContainerCount} container{activeContainerCount !== 1 ? 's' : ''} • {currentTotalWeight.toLocaleString()} lbs
        </Text>
      </View>

      <View style={styles.dashboardTabBar}>
        <View style={styles.dashboardTabGroup}>
          <TouchableOpacity
            style={[styles.dashboardTab, dashboardViewTab === 'dashboard' && styles.dashboardTabActive]}
            onPress={() => setDashboardViewTab('dashboard')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{selected: dashboardViewTab === 'dashboard'}}>
            <Text style={[styles.dashboardTabText, dashboardViewTab === 'dashboard' && styles.dashboardTabTextActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dashboardTab, dashboardViewTab === 'orders' && styles.dashboardTabActive]}
            onPress={() => setDashboardViewTab('orders')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{selected: dashboardViewTab === 'orders'}}>
            <Text style={[styles.dashboardTabText, dashboardViewTab === 'orders' && styles.dashboardTabTextActive]}>Upcoming Orders</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dashboardTabDateLabel} numberOfLines={1}>
          {dashboardDate}
        </Text>
      </View>

      {dashboardViewTab === 'dashboard' ? (
        renderDashboardTabContent(activeOrders, props)
      ) : (
      <View style={styles.scrollViewContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet() && styles.scrollContentTablet,
          ]}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={false}
          keyboardShouldPersistTaps="handled">

          {/* Show order details if an order is selected */}
          {dashboardSelectedOrder ? (
            <>
              <View style={styles.detailPaneHeader}>
                <TouchableOpacity
                  onPress={() => setDashboardSelectedOrder(null)}
                  activeOpacity={0.7}>
                  <Icon name="arrow-back" size={20} color={colors.foreground} />
                  <Text style={styles.backButtonText}>Back to Orders</Text>
                </TouchableOpacity>
                <Text style={styles.detailPaneTitle} numberOfLines={1}>
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
                        {getBusinessTypeStyle(dashboardSelectedOrder.orderType).label}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.detailRow, styles.programsDetailRow]}>
                    <Text style={styles.detailLabel}>Service Types:</Text>
                    <View style={styles.programsContainerInline}>
                      {dashboardSelectedOrder.programs.map((program, i) => {
                        const serviceOrderNumber = dashboardSelectedOrder.serviceOrderNumbers?.[program];
                        const noship = isServiceTypeNoShip(dashboardSelectedOrder.orderNumber, program);
                        const entry = serviceTypeTimeService.getTimeEntry(dashboardSelectedOrder.orderNumber, program);
                        const hasStart = entry?.startTime != null;
                        const hasEnd = entry?.endTime != null;
                        const inProgress = activeServiceTypeTimer === program;
                        const completed = !noship && hasStart && hasEnd;
                        const pending = !noship && !completed && !inProgress;
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
                        const chevronColor = noship
                          ? colors.mutedForeground
                          : completed
                            ? colors.success
                            : inProgress
                              ? colors.info
                              : colors.warning;
                        const canEditOrder = !isOrderCompleted(dashboardSelectedOrder.orderNumber);
                        return (
                          <Pressable
                            key={i}
                            onPress={() => {
                              if (canEditOrder && dashboardSelectedOrder) {
                                handleDashboardServiceTypeBadgePress(
                                  dashboardSelectedOrder,
                                  program,
                                  pending,
                                  noship,
                                );
                              }
                            }}
                            disabled={!canEditOrder}
                            style={({ pressed }) => [
                              canEditOrder && pressed && { opacity: 0.7 },
                              !canEditOrder && { opacity: 1 },
                            ]}
                            hitSlop={8}>
                            <Badge
                              variant="outline"
                              style={StyleSheet.flatten(badgeStyle)}
                              textStyle={textStyle}
                              title={serviceTypeService.getServiceTypeName(program)}
                              trailingIcon={
                                <Icon name="chevron-right" size={20} color={chevronColor} />
                              }>
                              {serviceOrderNumber
                                ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                                : serviceTypeService.formatForBadge(program)}
                            </Badge>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={[styles.detailActionsRow]}>
                    {isOrderCompleted(dashboardSelectedOrder.orderNumber) ? (
                      <Text style={styles.detailActionsOrderCompletedText}>
                        Order completed
                      </Text>
                    ) : (
                      <>
                        {isOrderReadyForManifest(dashboardSelectedOrder) && (
                          <>
                            <Button
                              title={hasManifestForOrder(dashboardSelectedOrder.orderNumber) ? 'Open manifest' : 'Continue to manifest'}
                              variant="primary"
                              size="lg"
                              style={styles.detailActionsRowButton}
                              onPress={() => {
                                handleGenerateManifestForOrder(dashboardSelectedOrder);
                              }}
                            />
                            {hasManifestForOrder(dashboardSelectedOrder.orderNumber) && (
                              <Button
                                title="Void manifest"
                                variant="destructive"
                                size="lg"
                                style={styles.detailActionsRowButton}
                                onPress={voidManifest}
                              />
                            )}
                          </>
                        )}
                        {dashboardSelectedOrder.programs.every((p) =>
                          isServiceTypeNoShip(dashboardSelectedOrder.orderNumber, p),
                        ) ? (
                          <Button
                            title="Complete Order as No-Ship"
                            variant="primary"
                            size="lg"
                            style={styles.detailActionsRowButton}
                            onPress={() => {
                              if (!dashboardSelectedOrder) return;
                              setCompletedOrders((prev) =>
                                prev.includes(dashboardSelectedOrder.orderNumber)
                                  ? prev
                                  : [...prev, dashboardSelectedOrder.orderNumber],
                              );
                              setSelectedServiceTypeToStart(null);
                            }}
                          />
                        ) : (
                          null
                        )}
                      </>
                    )}
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
                      <Badge variant="outline">{getBusinessTypeStyle(order.orderType).label}</Badge>
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
                      const entry = serviceTypeTimeService.getTimeEntry(order.orderNumber, program);
                      const hasStart = entry?.startTime != null;
                      const hasEnd = entry?.endTime != null;
                      const inProgress =
                        selectedOrderData?.orderNumber === order.orderNumber &&
                        activeServiceTypeTimer === program;
                      const completed = !noship && hasStart && hasEnd;
                      const pending = !noship && !completed && !inProgress;
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
                      const chevronColor = noship
                        ? colors.mutedForeground
                        : completed
                          ? colors.success
                          : inProgress
                            ? colors.info
                            : colors.warning;
                      const canEditOrder = !isOrderCompleted(order.orderNumber);
                      return (
                        <Pressable
                          key={i}
                          onPress={(e) => {
                            if (canEditOrder) {
                              handleDashboardServiceTypeBadgePress(
                                order,
                                program,
                                pending,
                                noship,
                              );
                            }
                          }}
                          style={({ pressed }) => [
                            canEditOrder && pressed && { opacity: 0.7 },
                          ]}
                          hitSlop={8}>
                          <Badge
                            variant="outline"
                            style={StyleSheet.flatten(badgeStyle)}
                            textStyle={textStyle}
                            title={serviceType?.name || program}
                            trailingIcon={
                              <Icon name="chevron-right" size={20} color={chevronColor} />
                            }>
                            {serviceOrderNumber
                              ? `${serviceTypeService.formatForBadge(program)} • ${serviceOrderNumber}`
                              : serviceTypeService.formatForBadge(program)}
                          </Badge>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>
            ))
              ) : completedOrdersList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Orders Scheduled</Text>
                  <Text style={styles.emptyStateText}>
                    You have no orders scheduled for today.
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* Completed Orders Section - collapsed at bottom */}
          {completedOrdersList.length > 0 && (
            <View style={styles.completedOrdersSection}>
              <TouchableOpacity
                style={styles.completedOrdersHeaderRow}
                onPress={() => setCompletedOrdersSectionCollapsed(prev => !prev)}
                activeOpacity={0.7}>
                <View style={styles.completedOrdersTitleRow}>
                  <Icon name="check-circle" size={18} color={colors.success} style={styles.completedOrdersIcon} />
                  <Text style={styles.completedOrdersTitle}>
                    Completed ({completedOrdersList.length})
                  </Text>
                  <Icon
                    name={completedOrdersSectionCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
                    size={24}
                    color={colors.mutedForeground}
                  />
                </View>
              </TouchableOpacity>
              {!completedOrdersSectionCollapsed &&
                completedOrdersList.map((order, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.completedOrderCard}
                    onPress={() => setDashboardSelectedOrder(order)}
                    activeOpacity={0.7}>
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
                        <Icon name="check-circle" size={20} color={colors.success} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </ScrollView>
      </View>
      )}
    </View>
  );
};
