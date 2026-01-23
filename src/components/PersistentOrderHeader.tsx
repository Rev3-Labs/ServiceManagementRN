import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Badge} from './Badge';
import {Icon} from './Icon';
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
  onViewNotes?: () => void;
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
}

export const PersistentOrderHeader: React.FC<PersistentOrderHeaderProps> = ({
  orderData,
  isCollapsed,
  onToggleCollapse,
  onBackPress,
  subtitle,
  elapsedTimeDisplay,
  onViewNotes,
  validationState,
  onViewValidation,
  onViewServiceCenter,
  truckNumber,
  trailerNumber,
  syncStatus = 'synced',
  pendingSyncCount = 0,
  onSync,
}) => {
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

  const hasJobNotes = 
    orderData.customerSpecialInstructions ||
    orderData.siteAccessNotes ||
    (orderData.safetyWarnings && orderData.safetyWarnings.length > 0) ||
    (orderData.previousServiceNotes && orderData.previousServiceNotes.length > 0);
  const formatAddress = () => {
    const parts = [orderData.site, orderData.city, orderData.state].filter(
      Boolean,
    );
    const address = parts.join(', ');
    // Add ZIP code if available
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

  return (
    <View style={styles.persistentOrderHeader}>
      {/* Header Row with Back Button, Order Number, Toggle, and Time Tracking */}
      <View style={styles.persistentHeaderTopRow}>
        {onBackPress && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.persistentHeaderToggle, {flex: 1}]}
          onPress={onToggleCollapse}
          activeOpacity={0.7}>
          <View style={styles.persistentHeaderTitleRow}>
            <View style={styles.persistentHeaderTitleContent}>
              <Text style={styles.persistentHeaderOrderNumber}>
                {orderData.orderNumber}
              </Text>

            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.persistentHeaderRightActions}>
          {serviceCenter && onViewServiceCenter && (
            <TouchableOpacity
              onPress={onViewServiceCenter}
              style={styles.serviceCenterBadge}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.7}>
              <Icon name="business" size={16} color={colors.primary} />
              <Text style={styles.serviceCenterText}>
                {isCollapsed 
                  ? serviceCenterService.getDisplayFormat(true)
                  : serviceCenterService.getDisplayFormat(false)}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onViewValidation}
            style={[
              styles.validationIndicator,
              (!validationState || validationState.state === 'none') && styles.validationIndicatorSuccess,
              validationState?.state === 'error' && styles.validationIndicatorError,
              validationState?.state === 'warning' && styles.validationIndicatorWarning,
            ]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            {(!validationState || validationState.state === 'none') ? (
              <Icon name="check-circle" size={18} color={colors.success} />
            ) : (
              <>
                <Icon
                  name="warning"
                  size={18}
                  color={validationState.state === 'error' ? colors.destructive : colors.warning}
                />
                {validationState.count > 0 && (
                  <View style={styles.validationCountBadge}>
                    <Text style={styles.validationCountText}>
                      {validationState.count}
                    </Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          {hasJobNotes && onViewNotes && (
            <TouchableOpacity
              onPress={onViewNotes}
              style={styles.notesButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.7}>
              <Icon name="assignment" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
          {/* Connection Status Indicator - Always Visible */}
          <TouchableOpacity
            style={[
              styles.connectionStatusButton,
              !offlineStatus.isOnline && styles.connectionStatusOfflineButton,
              offlineStatus.warningLevel === 'warning' && styles.connectionStatusWarning,
              offlineStatus.warningLevel === 'orange' && styles.connectionStatusOrange,
              offlineStatus.warningLevel === 'critical' && styles.connectionStatusCritical,
              offlineStatus.isBlocked && styles.connectionStatusBlocked,
            ]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            {offlineStatus.isOnline ? (
              <View style={styles.connectionStatusOnlineContainer}>
                <Icon name="check-circle" size={20} color={colors.success} />
                {!isCollapsed && (
                  <Text style={styles.connectionStatusOnlineText}>
                    Connected
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.connectionStatusOfflineContainer}>
                <Icon
                  name="error"
                  size={20}
                  color={
                    offlineStatus.isBlocked
                      ? colors.destructive
                      : offlineStatus.warningLevel === 'critical'
                      ? colors.destructive
                      : offlineStatus.warningLevel === 'orange'
                      ? '#FF6B35' // Orange color
                      : offlineStatus.warningLevel === 'warning'
                      ? colors.warning
                      : colors.mutedForeground
                  }
                />
                {!isCollapsed && (
                  <Text
                    style={[
                      styles.connectionStatusOfflineText,
                      offlineStatus.warningLevel === 'warning' && styles.connectionStatusWarningText,
                      offlineStatus.warningLevel === 'orange' && styles.connectionStatusOrangeText,
                      offlineStatus.warningLevel === 'critical' && styles.connectionStatusCriticalText,
                      offlineStatus.isBlocked && styles.connectionStatusBlockedText,
                    ]}>
                    Offline: {offlineStatus.offlineDurationFormatted}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
          {/* Collapse/Expand Toggle Icon - Far Right */}
          <TouchableOpacity
            onPress={onToggleCollapse}
            style={styles.persistentHeaderToggleIconButton}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            activeOpacity={0.7}>
            <Icon
              name={isCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!isCollapsed && (
        <View style={styles.persistentHeaderContent}>
          {/* Elapsed Time Display */}
          {elapsedTimeDisplay && (
            <View style={styles.persistentHeaderRow}>
              <View style={styles.persistentHeaderItem}>
                <Text style={styles.persistentHeaderLabel}>Elapsed Time</Text>
                <View style={styles.timeTrackingBadge}>
                  <Text style={styles.timeTrackingText}>{elapsedTimeDisplay}</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.persistentHeaderRow}>
            <View style={styles.persistentHeaderItem}>
              <Text style={styles.persistentHeaderLabel}>Required Date</Text>
              <Text style={styles.persistentHeaderValue}>
                {orderData.requiredDate || 'N/A'}
              </Text>
            </View>
            <View style={styles.persistentHeaderItem}>
              <Text style={styles.persistentHeaderLabel}>Address</Text>
              <Text style={styles.persistentHeaderValue}>
                {formatAddress()}
              </Text>
            </View>
          </View>

          <View style={styles.persistentHeaderRow}>
            <View style={styles.persistentHeaderItem}>
              <Text style={styles.persistentHeaderLabel}>Generator Status</Text>
              {orderData.generatorStatus ? (
                <View style={styles.persistentHeaderBadge}>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: getGeneratorStatusColor(
                        orderData.generatorStatus,
                      ),
                    }}
                    textStyle={{
                      color: getGeneratorStatusColor(orderData.generatorStatus),
                    }}>
                    {orderData.generatorStatus}
                  </Badge>
                </View>
              ) : (
                <Text style={styles.persistentHeaderValue}>N/A</Text>
              )}
            </View>
            <View style={styles.persistentHeaderItem}>
              <Text style={styles.persistentHeaderLabel}>Order Status</Text>
              <Badge variant={getStatusBadgeVariant(orderData.status)}>
                {orderData.status}
              </Badge>
            </View>
            <View style={styles.persistentHeaderItem}>
              <Text style={styles.persistentHeaderLabel}>EPA ID</Text>
              <Badge
                variant={orderData.epaId ? 'default' : 'destructive'}
                style={styles.persistentHeaderBadge}>
                {orderData.epaId ? 'Yes' : 'No'}
              </Badge>
            </View>
          </View>

          {/* Vehicle Information */}
          {!isCollapsed && (truckNumber || trailerNumber) && (
            <View style={styles.persistentHeaderRow}>
              {truckNumber && (
                <View style={styles.persistentHeaderItem}>
                  <Text style={styles.persistentHeaderLabel}>Truck</Text>
                  <Text style={styles.persistentHeaderValue}>
                    {truckNumber}
                  </Text>
                </View>
              )}
              {trailerNumber ? (
                <View style={styles.persistentHeaderItem}>
                  <Text style={styles.persistentHeaderLabel}>Trailer</Text>
                  <Text style={styles.persistentHeaderValue}>
                    {trailerNumber}
                  </Text>
                </View>
              ) : (
                <View style={styles.persistentHeaderItem}>
                  <Text style={styles.persistentHeaderLabel}>Trailer</Text>
                  <Text style={styles.persistentHeaderValue}>None</Text>
                </View>
              )}
            </View>
          )}

          {/* Sync Information */}
          {!isCollapsed && (
            <View style={styles.syncInfoRow}>
              <View style={styles.syncInfoLeft}>
                <Text style={styles.lastSyncLabel}>Last sync:</Text>
                <Text style={styles.lastSyncValue}>
                  {offlineStatus.lastSyncFormatted || 'Never synced'}
                </Text>
              </View>
              {onSync && (
                <TouchableOpacity
                  onPress={onSync}
                  disabled={syncStatus === 'syncing' || offlineStatus.isBlocked}
                  style={[
                    styles.syncButton,
                    (syncStatus === 'syncing' || offlineStatus.isBlocked) && styles.syncButtonDisabled
                  ]}
                  activeOpacity={0.7}>
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Icon name="sync" size={16} color={colors.primaryForeground} />
                  )}
                  <Text style={styles.syncButtonText}>Sync</Text>
                  {pendingSyncCount > 0 && (
                    <Badge variant="secondary" style={styles.syncButtonBadge}>
                      {pendingSyncCount}
                    </Badge>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
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
  persistentHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  persistentHeaderToggle: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  persistentHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  persistentHeaderTitleContent: {
    flex: 1,
  },
  persistentHeaderOrderNumber: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  persistentHeaderSubtitle: {
    ...typography.base,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  persistentHeaderToggleIcon: {
    marginLeft: spacing.sm,
  },
  persistentHeaderToggleIconButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
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
  persistentHeaderContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  persistentHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  persistentHeaderItem: {
    flex: 1,
    minWidth: 150,
  },
  persistentHeaderLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  persistentHeaderValue: {
    ...typography.base,
    color: colors.foreground,
    fontWeight: '500',
  },
  persistentHeaderBadge: {
    marginTop: spacing.xs,
  },
  persistentHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notesButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  validationIndicator: {
    position: 'relative',
    padding: spacing.xs,
    marginRight: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationIndicatorError: {
    backgroundColor: colors.destructive + '20',
  },
  validationIndicatorWarning: {
    backgroundColor: colors.warning + '20',
  },
  validationIndicatorSuccess: {
    padding: spacing.xs,
    marginRight: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success + '20',
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.destructive,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.card,
  },
  validationCountText: {
    ...typography.xs,
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  connectionStatusButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionStatusOnlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  connectionStatusOnlineText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.success,
  },
  connectionStatusOfflineButton: {
    backgroundColor: colors.muted + '20',
  },
  connectionStatusWarning: {
    backgroundColor: colors.warning + '20',
  },
  connectionStatusOrange: {
    backgroundColor: '#FF6B35' + '20',
  },
  connectionStatusCritical: {
    backgroundColor: colors.destructive + '30',
  },
  connectionStatusBlocked: {
    backgroundColor: colors.destructive + '40',
  },
  connectionStatusOfflineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  connectionStatusOfflineText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  connectionStatusWarningText: {
    color: colors.warning,
  },
  connectionStatusOrangeText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  connectionStatusCriticalText: {
    color: colors.destructive,
    fontWeight: '700',
  },
  connectionStatusBlockedText: {
    color: colors.destructive,
    fontWeight: '700',
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  syncInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  lastSyncLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
  },
  lastSyncValue: {
    ...typography.xs,
    color: colors.foreground,
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  syncButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  syncButtonText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  syncButtonBadge: {
    marginLeft: spacing.xs,
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
    marginRight: spacing.sm,
  },
  serviceCenterText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primary,
  },
});
