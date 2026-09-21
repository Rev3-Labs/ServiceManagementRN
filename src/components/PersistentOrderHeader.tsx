import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {Badge} from './Badge';
import {Icon} from './Icon';
import {StickyNoteIcon} from './StickyNoteIcon';
import {ConnectedDevicesControl} from './ConnectedDevicesControl';
import {hasServiceNotes} from './ServiceNotesContent';
import {OrderData} from '../types/wasteCollection';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {offlineTrackingService, OfflineStatus} from '../services/offlineTrackingService';
import {serviceCenterService} from '../services/serviceCenterService';
import {SyncStatus} from '../services/syncService';

interface PersistentOrderHeaderProps {
  orderData: OrderData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onBackPress?: () => void;
  subtitle?: string;
  elapsedTimeDisplay?: string;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onViewNotes?: () => void;
  /** Opens technician Work Order Notes (distinct from inbound Job Notes). */
  onOrderNotes?: () => void;
  /** True when technician has saved non-empty work order notes. */
  hasWorkOrderNotes?: boolean;
  validationState?: {
    state: 'none' | 'warning' | 'error';
    count: number;
  };
  onViewValidation?: () => void;
  onViewServiceCenter?: () => void;
  truckNumber?: string;
  trailerNumber?: string | null;
  syncStatus?: SyncStatus;
  pendingSyncCount?: number;
  onSync?: () => void;
  /** FR-3a.UI.8.1: Service type badges [ST ID] • [SR Number], color by status. Tap navigates to that service type detail. */
  serviceTypeBadges?: Array<{
    serviceTypeId: string;
    srNumber?: string;
    status: 'pending' | 'in-progress' | 'noship' | 'completed';
  }>;
  onServiceTypeBadgePress?: (serviceTypeId: string) => void;
}

export const PersistentOrderHeader: React.FC<PersistentOrderHeaderProps> = ({
  orderData,
  isCollapsed,
  onToggleCollapse,
  elapsedTimeDisplay,
  isPaused = false,
  onPause,
  onResume,
  onViewNotes,
  onOrderNotes,
  hasWorkOrderNotes = false,
  validationState,
  onViewValidation,
  onViewServiceCenter,
  truckNumber,
  trailerNumber,
  syncStatus = 'synced',
  pendingSyncCount = 0,
  onSync,
  serviceTypeBadges,
  onServiceTypeBadgePress,
}) => {
  const {width: windowWidth} = useWindowDimensions();
  /** Portrait Zebra (~800) and similar widths need denser chrome. */
  const isNarrow = windowWidth < 960;

  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(
    offlineTrackingService.getStatus(),
  );
  const [serviceCenter, setServiceCenter] = useState(
    serviceCenterService.getServiceCenter(),
  );

  useEffect(() => {
    const unsubscribe = offlineTrackingService.onStatusChange(setOfflineStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = serviceCenterService.onServiceCenterChange(setServiceCenter);
    return unsubscribe;
  }, []);

  const hasJobNotes = hasServiceNotes(orderData);
  const formatAddress = () => {
    const parts = [orderData.site, orderData.city, orderData.state].filter(
      Boolean,
    );
    const address = parts.join(', ');
    if (orderData.zip) {
      return `${address} ${orderData.zip}`;
    }
    return address;
  };

  const getStatusBadgeVariant = (status: OrderData['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getGeneratorStatusColor = (status?: string) => {
    switch (status) {
      case 'LQG':
        return colors.destructive;
      case 'SQG':
        return colors.warning;
      case 'CESQG':
        return colors.info;
      case 'VSQG':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const syncIsError =
    syncStatus === 'error' ||
    syncStatus === 'offline' ||
    !offlineStatus.isOnline;
  const syncDisabled =
    syncStatus === 'syncing' ||
    !offlineStatus.isOnline ||
    offlineStatus.isBlocked;
  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : !offlineStatus.isOnline
        ? 'Offline'
        : syncStatus === 'error'
          ? 'Failed'
          : syncStatus === 'pending' && pendingSyncCount > 0
            ? `${pendingSyncCount} pending`
            : 'Synced';

  const renderServiceTypeBadges = () => {
    if (!serviceTypeBadges || serviceTypeBadges.length === 0) {
      return null;
    }
    return (
      <View
        style={[
          styles.serviceTypeBadgesRow,
          isCollapsed && styles.serviceTypeBadgesRowCollapsed,
        ]}>
        {serviceTypeBadges.map(({serviceTypeId, srNumber, status}) => {
          const label = srNumber
            ? `${serviceTypeId} • ${srNumber}`
            : serviceTypeId;
          const isNoship = status === 'noship';
          const isInProgress = status === 'in-progress';
          const isCompleted = status === 'completed';
          const isPending = status === 'pending';
          const badgeStyle = [
            styles.serviceTypeBadge,
            isNoship && styles.serviceTypeBadgeNoship,
            isCompleted && styles.serviceTypeBadgeCompleted,
            isInProgress && styles.serviceTypeBadgeInProgress,
            isPending && styles.serviceTypeBadgePending,
          ];
          const textContent = (
            <View style={styles.serviceTypeBadgeContent}>
              {isCompleted && (
                <Icon
                  name="check"
                  size={14}
                  color={colors.success}
                  style={styles.serviceTypeBadgeIcon}
                />
              )}
              <Text
                style={[
                  styles.serviceTypeBadgeText,
                  isNoship && styles.serviceTypeBadgeTextNoship,
                  isCompleted && styles.serviceTypeBadgeTextCompleted,
                  isInProgress && styles.serviceTypeBadgeTextInProgress,
                  isPending && styles.serviceTypeBadgeTextPending,
                ]}
                numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
          return onServiceTypeBadgePress ? (
            <TouchableOpacity
              key={serviceTypeId}
              style={badgeStyle}
              onPress={() => onServiceTypeBadgePress(serviceTypeId)}
              activeOpacity={0.7}>
              {textContent}
            </TouchableOpacity>
          ) : (
            <View key={serviceTypeId} style={badgeStyle}>
              {textContent}
            </View>
          );
        })}
      </View>
    );
  };

  const renderMetaCell = (
    label: string,
    value: React.ReactNode,
    key: string,
  ) => (
    <View
      key={key}
      style={[styles.metaCell, isNarrow && styles.metaCellNarrow]}>
      <Text style={styles.persistentHeaderLabel}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={styles.persistentHeaderValue} numberOfLines={2}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.persistentOrderHeader,
        isNarrow && styles.persistentOrderHeaderNarrow,
        isCollapsed && styles.persistentOrderHeaderCollapsed,
      ]}>
      {/* Title row: order + icon actions only (no labeled chips that overflow) */}
      <View
        style={[
          styles.persistentHeaderTopRow,
          isCollapsed && styles.persistentHeaderTopRowCollapsed,
        ]}>
        <TouchableOpacity
          style={styles.persistentHeaderToggle}
          onPress={onToggleCollapse}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.persistentHeaderOrderNumber,
              isCollapsed && styles.persistentHeaderOrderNumberCollapsed,
            ]}
            numberOfLines={1}>
            {orderData.orderNumber}
          </Text>
          {renderServiceTypeBadges()}
        </TouchableOpacity>

        <View
          style={[
            styles.persistentHeaderRightActions,
            isCollapsed && styles.persistentHeaderRightActionsCollapsed,
          ]}>
          <TouchableOpacity
            onPress={onViewValidation}
            style={[
              styles.iconAction,
              validationState?.state === 'error' && styles.iconActionError,
              validationState?.state === 'warning' && styles.iconActionWarning,
            ]}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.7}
            accessibilityLabel="Validation">
            {!validationState || validationState.state === 'none' ? (
              <Icon name="check-circle" size={20} color={colors.success} />
            ) : (
              <>
                <Icon
                  name="warning"
                  size={20}
                  color={
                    validationState.state === 'error'
                      ? colors.destructive
                      : colors.warning
                  }
                />
                {validationState.count > 0 && (
                  <View
                    style={[
                      styles.actionBadge,
                      validationState.state === 'error'
                        ? styles.actionBadgeError
                        : styles.actionBadgeWarning,
                    ]}>
                    <Text style={styles.actionBadgeText}>
                      {validationState.count}
                    </Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          <ConnectedDevicesControl buttonStyle={styles.iconAction} />

          {onOrderNotes && (
            <TouchableOpacity
              onPress={onOrderNotes}
              style={[
                styles.iconAction,
                hasWorkOrderNotes && styles.iconActionNotesActive,
              ]}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.7}
              accessibilityLabel="Order Notes"
              accessibilityHint="Open work order notes">
              <StickyNoteIcon size={18} hasContent={hasWorkOrderNotes} />
            </TouchableOpacity>
          )}

          {hasJobNotes && onViewNotes && (
            <TouchableOpacity
              onPress={onViewNotes}
              style={styles.iconAction}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.7}
              accessibilityLabel="Service Notes">
              <Icon name="assignment" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.iconAction,
              !offlineStatus.isOnline && styles.iconActionOffline,
              offlineStatus.warningLevel === 'warning' &&
                styles.iconActionWarning,
              offlineStatus.warningLevel === 'orange' &&
                styles.iconActionOrange,
              (offlineStatus.warningLevel === 'critical' ||
                offlineStatus.isBlocked) &&
                styles.iconActionError,
            ]}
            accessibilityRole="image"
            accessibilityLabel={
              offlineStatus.isOnline
                ? 'Connected to server'
                : `Disconnected from server. Offline ${offlineStatus.offlineDurationFormatted}`
            }>
            <Icon
              name={offlineStatus.isOnline ? 'cloud-done' : 'cloud-off'}
              size={20}
              color={
                offlineStatus.isOnline
                  ? colors.success
                  : offlineStatus.isBlocked ||
                      offlineStatus.warningLevel === 'critical'
                    ? colors.destructive
                    : offlineStatus.warningLevel === 'orange'
                      ? '#FF6B35'
                      : offlineStatus.warningLevel === 'warning'
                        ? colors.warning
                        : colors.mutedForeground
              }
            />
          </View>

          <TouchableOpacity
            onPress={onToggleCollapse}
            style={styles.iconAction}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.7}
            accessibilityLabel={
              isCollapsed ? 'Expand header' : 'Collapse header'
            }>
            <Icon
              name={isCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
              size={22}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!isCollapsed && (
        <View style={styles.persistentHeaderContent}>
          {/* Toolbar: time, service center, sync — wraps cleanly on narrow widths */}
          <View style={styles.toolbarRow}>
            {elapsedTimeDisplay ? (
              <View style={styles.timeTrackingRow}>
                <View style={styles.timeTrackingBadge}>
                  <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
                </View>
                {(onPause || onResume) && (
                  <TouchableOpacity
                    onPress={isPaused ? onResume : onPause}
                    style={[
                      styles.pauseButton,
                      isPaused && styles.pauseButtonActive,
                    ]}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    activeOpacity={0.7}>
                    <Icon
                      name={isPaused ? 'play-arrow' : 'pause'}
                      size={16}
                      color={
                        isPaused ? colors.primaryForeground : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.pauseButtonText,
                        isPaused && styles.pauseButtonTextActive,
                      ]}>
                      {isPaused ? 'Continue' : 'Pause'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {serviceCenter && onViewServiceCenter ? (
              <TouchableOpacity
                onPress={onViewServiceCenter}
                style={styles.serviceCenterBadge}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                activeOpacity={0.7}>
                <Icon name="business" size={16} color={colors.primary} />
                <Text style={styles.serviceCenterText} numberOfLines={1}>
                  {serviceCenterService.getDisplayFormat(false)}
                </Text>
              </TouchableOpacity>
            ) : null}

            {onSync ? (
              <View style={styles.headerSyncRow}>
                <View
                  style={[
                    styles.headerSyncStatusChip,
                    syncIsError && styles.headerSyncStatusChipError,
                    (syncStatus === 'synced' || syncStatus === 'pending') &&
                      styles.headerSyncStatusChipSynced,
                  ]}>
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View
                      style={[
                        styles.headerSyncDot,
                        syncIsError && styles.headerSyncDotError,
                        (syncStatus === 'synced' ||
                          syncStatus === 'pending') &&
                          styles.headerSyncDotSynced,
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.headerSyncStatusText,
                      syncIsError && styles.headerSyncStatusTextError,
                      (syncStatus === 'synced' || syncStatus === 'pending') &&
                        styles.headerSyncStatusTextSynced,
                    ]}
                    numberOfLines={1}>
                    {syncLabel}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onSync}
                  disabled={syncDisabled}
                  style={[
                    styles.headerSyncButton,
                    syncDisabled && styles.headerSyncButtonDisabled,
                  ]}
                  activeOpacity={0.7}>
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    <Icon
                      name="sync"
                      size={16}
                      color={colors.primaryForeground}
                    />
                  )}
                  <Text style={styles.headerSyncButtonText}>Sync</Text>
                  {pendingSyncCount > 0 && syncStatus !== 'syncing' && (
                    <Badge
                      variant="secondary"
                      style={styles.headerSyncButtonBadge}>
                      {pendingSyncCount}
                    </Badge>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Address gets full width — longest field and critical for field use */}
          <View style={styles.addressBlock}>
            <Text style={styles.persistentHeaderLabel}>Address</Text>
            <Text style={styles.addressValue}>{formatAddress()}</Text>
          </View>

          {/* Compact meta grid: 2 cols on narrow, more on wide */}
          <View style={styles.metaGrid}>
            {renderMetaCell(
              'Required Date',
              orderData.requiredDate || 'N/A',
              'required-date',
            )}
            {renderMetaCell(
              'Generator Status',
              orderData.generatorStatus ? (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: getGeneratorStatusColor(
                      orderData.generatorStatus,
                    ),
                    alignSelf: 'flex-start',
                  }}
                  textStyle={{
                    color: getGeneratorStatusColor(orderData.generatorStatus),
                  }}>
                  {orderData.generatorStatus}
                </Badge>
              ) : (
                'N/A'
              ),
              'generator',
            )}
            {renderMetaCell(
              'Order Status',
              <Badge
                variant={getStatusBadgeVariant(orderData.status)}
                style={{alignSelf: 'flex-start'}}>
                {orderData.status}
              </Badge>,
              'order-status',
            )}
            {renderMetaCell(
              'EPA ID',
              <Badge
                variant={orderData.epaId ? 'default' : 'destructive'}
                style={{alignSelf: 'flex-start'}}>
                {orderData.epaId ? 'Yes' : 'No'}
              </Badge>,
              'epa',
            )}
            {truckNumber
              ? renderMetaCell('Truck', truckNumber, 'truck')
              : null}
            {renderMetaCell('Trailer', trailerNumber || 'None', 'trailer')}
          </View>

          <View style={styles.syncInfoRow}>
            <Text style={styles.lastSyncLabel}>Last sync:</Text>
            <Text style={styles.lastSyncValue} numberOfLines={1}>
              {offlineStatus.lastSyncFormatted || 'Never synced'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  persistentOrderHeader: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  persistentOrderHeaderNarrow: {
    paddingHorizontal: spacing.md,
  },
  persistentOrderHeaderCollapsed: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  persistentHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  persistentHeaderTopRowCollapsed: {
    alignItems: 'center',
  },
  persistentHeaderToggle: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.xs / 2,
  },
  persistentHeaderOrderNumber: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  persistentHeaderOrderNumberCollapsed: {
    ...typography.base,
  },
  serviceTypeBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  serviceTypeBadgesRowCollapsed: {
    marginTop: spacing.xs / 2,
    gap: spacing.xs / 2,
  },
  serviceTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  serviceTypeBadgePending: {
    backgroundColor: colors.warning + '22',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  serviceTypeBadgeInProgress: {
    backgroundColor: colors.info + '22',
    borderWidth: 1,
    borderColor: colors.info,
  },
  serviceTypeBadgeNoship: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceTypeBadgeCompleted: {
    backgroundColor: colors.success + '22',
    borderWidth: 1,
    borderColor: colors.success,
  },
  serviceTypeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceTypeBadgeIcon: {
    marginRight: spacing.xs / 2,
  },
  serviceTypeBadgeText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.foreground,
  },
  serviceTypeBadgeTextPending: {
    color: colors.warning,
  },
  serviceTypeBadgeTextInProgress: {
    color: colors.info,
  },
  serviceTypeBadgeTextNoship: {
    color: colors.mutedForeground,
  },
  serviceTypeBadgeTextCompleted: {
    color: colors.success,
  },
  persistentHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
    paddingTop: spacing.xs / 2,
  },
  persistentHeaderRightActionsCollapsed: {
    paddingTop: 0,
  },
  /** Shared chrome for every header action — same size, border, and fill. */
  iconAction: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 0,
  },
  iconActionWarning: {
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning + '80',
  },
  iconActionError: {
    backgroundColor: colors.destructive + '18',
    borderColor: colors.destructive + '80',
  },
  iconActionOrange: {
    backgroundColor: '#FF6B35' + '18',
    borderColor: '#FF6B35' + '80',
  },
  iconActionOffline: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  iconActionNotesActive: {
    backgroundColor: '#F5D76E' + '33',
    borderColor: colors.border,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  actionBadgeError: {
    backgroundColor: colors.destructive,
  },
  actionBadgeWarning: {
    backgroundColor: colors.warning,
  },
  actionBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  persistentHeaderContent: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeTrackingRow: {
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
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  pauseButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pauseButtonText: {
    ...typography.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  pauseButtonTextActive: {
    color: colors.primaryForeground,
  },
  serviceCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    backgroundColor: colors.primary + '15',
    maxWidth: '100%',
    flexShrink: 1,
  },
  serviceCenterText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },
  headerSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  headerSyncStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 140,
  },
  headerSyncStatusChipSynced: {
    backgroundColor: colors.success + '18',
    borderColor: colors.success + '60',
  },
  headerSyncStatusChipError: {
    backgroundColor: colors.destructive + '18',
    borderColor: colors.destructive + '60',
  },
  headerSyncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mutedForeground,
  },
  headerSyncDotSynced: {
    backgroundColor: colors.success,
  },
  headerSyncDotError: {
    backgroundColor: colors.destructive,
  },
  headerSyncStatusText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.foreground,
    flexShrink: 1,
  },
  headerSyncStatusTextSynced: {
    color: colors.success,
  },
  headerSyncStatusTextError: {
    color: colors.destructive,
  },
  headerSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  headerSyncButtonDisabled: {
    opacity: 0.6,
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  headerSyncButtonText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  headerSyncButtonBadge: {
    marginLeft: spacing.xs,
  },
  addressBlock: {
    width: '100%',
  },
  addressValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
    lineHeight: 26,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaCell: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: '22%',
  },
  metaCellNarrow: {
    flexBasis: '46%',
    minWidth: 140,
    maxWidth: '48%',
  },
  persistentHeaderLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
  },
  persistentHeaderValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lastSyncLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
  },
  lastSyncValue: {
    ...typography.xs,
    color: colors.foreground,
    fontWeight: '500',
    flexShrink: 1,
  },
});
