import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {Button} from './Button';
import {Icon} from './Icon';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';
import {formatDuration} from '../services/timeTrackingService';
import {
  ConnectedDevice,
  DeviceConnectionStatus,
  deviceStatusService,
  formatDeviceLastUpdated,
  formatDeviceStatusLabel,
} from '../services/deviceStatusService';
import {SyncStatus} from '../services/syncService';
import {OfflineStatus} from '../services/offlineTrackingService';
import {Screen} from '../types/wasteCollection';

export interface DashboardHeaderChromeProps {
  variant: 'compact' | 'expanded';
  username?: string;
  dashboardDutyStatus: string;
  dashboardDutyElapsedMs: number;
  selectedTruck: {number: string; description?: string} | null;
  truckId: string;
  selectedTrailer: {number: string; description?: string} | null;
  dashboardRouteId: string;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  offlineStatus: OfflineStatus;
  handleManualSync: () => void;
  onNavigate?: (screen: Screen) => void;
  /** Compact: Drop / Notes + more. Expanded: Drop / Full Screen / Logout. */
  actions?: React.ReactNode;
  offlineLimitMessage?: React.ReactNode;
}

function getStatusIconColor(status: DeviceConnectionStatus): string {
  switch (status) {
    case 'connected':
      return colors.success;
    case 'connecting':
      return colors.info;
    case 'disconnected':
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

function buildAssignmentSummary(
  truckLabel: string,
  trailerLabel: string | null,
): string {
  if (trailerLabel) {
    return `${truckLabel} · ${trailerLabel}`;
  }
  return truckLabel;
}

export const DashboardHeaderChrome: React.FC<DashboardHeaderChromeProps> = ({
  variant: _variant,
  username,
  dashboardDutyStatus,
  dashboardDutyElapsedMs,
  selectedTruck,
  truckId,
  selectedTrailer,
  dashboardRouteId,
  syncStatus,
  pendingSyncCount,
  offlineStatus,
  handleManualSync,
  onNavigate,
  actions,
  offlineLimitMessage,
}) => {
  const [showAssignmentSheet, setShowAssignmentSheet] = useState(false);
  const [showDevicesSheet, setShowDevicesSheet] = useState(false);
  const [devices, setDevices] = useState<ConnectedDevice[]>(
    deviceStatusService.getDevices(),
  );
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  useEffect(() => deviceStatusService.onDevicesChange(setDevices), []);

  const truckLabel = selectedTruck?.number || truckId || '—';
  const trailerLabel = selectedTrailer?.number || null;
  const assignmentSummary = buildAssignmentSummary(truckLabel, trailerLabel);

  const connectedCount = useMemo(
    () => devices.filter(d => d.status === 'connected').length,
    [devices],
  );
  const disconnectedCount = useMemo(
    () =>
      devices.filter(
        d => d.status === 'disconnected' || d.status === 'unavailable',
      ).length,
    [devices],
  );
  const hasConnecting = useMemo(
    () => devices.some(d => d.status === 'connecting'),
    [devices],
  );
  const devicesNeedAttention = disconnectedCount > 0;

  const sortedDevices = useMemo(() => {
    const rank = (status: DeviceConnectionStatus) => {
      switch (status) {
        case 'disconnected':
          return 0;
        case 'unavailable':
          return 1;
        case 'connecting':
          return 2;
        default:
          return 3;
      }
    };
    return [...devices].sort((a, b) => rank(a.status) - rank(b.status));
  }, [devices]);

  const handleReconnect = async (device: ConnectedDevice) => {
    if (device.status === 'connected' || device.status === 'connecting') {
      return;
    }
    setReconnectingId(device.id);
    try {
      await deviceStatusService.reconnectDevice(device.id);
    } finally {
      setReconnectingId(null);
    }
  };

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

  const syncIsError =
    syncStatus === 'error' ||
    syncStatus === 'offline' ||
    !offlineStatus.isOnline;
  const syncDisabled =
    syncStatus === 'syncing' || !offlineStatus.isOnline;

  const identityBlock = (
    <TouchableOpacity
      style={styles.identity}
      onPress={() => onNavigate?.('Settings')}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open settings">
      <Text style={styles.name} numberOfLines={1}>
        {username || 'User'}
      </Text>
      <View
        style={[
          styles.dutyBadge,
          dashboardDutyStatus === 'On duty' && styles.dutyBadgeActive,
        ]}>
        <Text
          style={[
            styles.dutyBadgeText,
            dashboardDutyStatus === 'On duty' && styles.dutyBadgeTextActive,
          ]}
          numberOfLines={1}>
          {dashboardDutyStatus}
        </Text>
      </View>
      <Text style={styles.dutyTime} numberOfLines={1}>
        {formatDuration(dashboardDutyElapsedMs)}
      </Text>
    </TouchableOpacity>
  );

  const assignmentChip = (
    <TouchableOpacity
      style={styles.assignmentChip}
      onPress={() => setShowAssignmentSheet(true)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Assignment ${assignmentSummary}. Open details.`}>
      <Icon name="local-shipping" size={20} color={colors.primary} />
      <Text style={styles.assignmentChipText} numberOfLines={1}>
        {assignmentSummary}
      </Text>
      <Icon name="expand-more" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  const devicesButton = (
    <TouchableOpacity
      style={[
        styles.iconButton,
        devicesNeedAttention && styles.devicesButtonAttention,
      ]}
      onPress={() => setShowDevicesSheet(true)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        devicesNeedAttention
          ? `${disconnectedCount} device${disconnectedCount !== 1 ? 's' : ''} disconnected`
          : `${connectedCount} of ${devices.length} devices connected`
      }>
      {hasConnecting ? (
        <ActivityIndicator size="small" color={colors.info} />
      ) : (
        <Icon
          name="devices"
          size={22}
          color={
            devicesNeedAttention ? colors.warning : colors.mutedForeground
          }
        />
      )}
      {devicesNeedAttention ? (
        <View style={styles.devicesBadge}>
          <Text style={styles.devicesBadgeText}>{disconnectedCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const syncChip = (
    <TouchableOpacity
      style={[
        styles.syncChip,
        (syncStatus === 'synced' || syncStatus === 'pending') &&
          styles.syncStatusOk,
        syncStatus === 'syncing' && styles.syncStatusSyncing,
        syncIsError && styles.syncStatusError,
      ]}
      onPress={handleManualSync}
      disabled={syncDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Sync status ${syncLabel}. Tap to sync.`}>
      {syncStatus === 'syncing' ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View
          style={[
            styles.syncDot,
            (syncStatus === 'synced' || syncStatus === 'pending') &&
              styles.syncDotOk,
            syncIsError && styles.syncDotError,
          ]}
        />
      )}
      <Text
        style={[
          styles.syncText,
          (syncStatus === 'synced' || syncStatus === 'pending') &&
            styles.syncTextOk,
          syncIsError && styles.syncTextError,
        ]}>
        {syncLabel}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {identityBlock}
          {assignmentChip}
          {offlineLimitMessage}
        </View>
        <View style={styles.headerActions}>
          {devicesButton}
          {syncChip}
          {actions}
        </View>
      </View>

      {/* Assignment sheet */}
      <Modal
        visible={showAssignmentSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignmentSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAssignmentSheet(false)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Assignment</Text>
              <TouchableOpacity
                onPress={() => setShowAssignmentSheet(false)}
                hitSlop={8}
                accessibilityLabel="Close assignment">
                <Icon name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              bounces={false}
              keyboardShouldPersistTaps="handled">
              <AssignmentRow
                label="Truck"
                value={truckLabel}
                onChange={() => {
                  setShowAssignmentSheet(false);
                  onNavigate?.('Settings');
                }}
              />
              <AssignmentRow
                label="Trailer"
                value={trailerLabel || '—'}
                onChange={() => {
                  setShowAssignmentSheet(false);
                  onNavigate?.('Settings');
                }}
              />
              <AssignmentRow label="Route" value={dashboardRouteId || '—'} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Devices quick sheet */}
      <Modal
        visible={showDevicesSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDevicesSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDevicesSheet(false)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetTitle}>Connected devices</Text>
                <Text style={styles.sheetSubtitle}>
                  {connectedCount} of {devices.length} connected
                  {devicesNeedAttention
                    ? ` · ${disconnectedCount} need attention`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDevicesSheet(false)}
                hitSlop={8}
                accessibilityLabel="Close devices">
                <Icon name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              bounces={false}
              keyboardShouldPersistTaps="handled">
              {sortedDevices.map(device => {
                const isReconnecting = reconnectingId === device.id;
                const isConnecting =
                  isReconnecting || device.status === 'connecting';
                const canReconnect =
                  device.id !== 'camera' &&
                  (device.status === 'disconnected' ||
                    device.status === 'unavailable');
                const needsAttention =
                  device.status === 'disconnected' ||
                  device.status === 'unavailable';
                const statusLabel = formatDeviceStatusLabel(device.status);
                const metaParts = [
                  device.detail,
                  needsAttention || isConnecting
                    ? statusLabel
                    : `Updated ${formatDeviceLastUpdated(device.lastUpdated)}`,
                ].filter(Boolean);

                return (
                  <View
                    key={device.id}
                    style={[
                      styles.deviceRow,
                      needsAttention && styles.deviceRowAttention,
                    ]}>
                    <View
                      style={[
                        styles.deviceIconWrap,
                        device.status === 'connected' &&
                          styles.deviceIconWrapOk,
                        needsAttention && styles.deviceIconWrapAttention,
                      ]}>
                      <Icon
                        name={device.icon}
                        size={22}
                        color={getStatusIconColor(device.status)}
                      />
                    </View>
                    <View style={styles.deviceTextWrap}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text
                        style={[
                          styles.deviceMeta,
                          needsAttention && styles.deviceMetaAttention,
                          isConnecting && styles.deviceMetaConnecting,
                        ]}
                        numberOfLines={2}>
                        {metaParts.join(' · ')}
                      </Text>
                    </View>
                    {canReconnect ? (
                      <Button
                        title="Reconnect"
                        variant="primary"
                        size="sm"
                        disabled={isConnecting}
                        onPress={() => handleReconnect(device)}
                      />
                    ) : isConnecting ? (
                      <View style={styles.deviceStatusQuiet}>
                        <ActivityIndicator size="small" color={colors.info} />
                        <Text style={styles.deviceStatusQuietText}>
                          Connecting…
                        </Text>
                      </View>
                    ) : device.status === 'connected' ? (
                      <View style={styles.deviceStatusQuiet}>
                        <Icon
                          name="check-circle"
                          size={18}
                          color={colors.success}
                        />
                        <Text style={styles.deviceStatusConnectedText}>
                          Connected
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Button
                title="Manage all devices"
                variant="primary"
                size="md"
                onPress={() => {
                  setShowDevicesSheet(false);
                  onNavigate?.('Devices');
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface AssignmentRowProps {
  label: string;
  value: string;
  onChange?: () => void;
}

function AssignmentRow({label, value, onChange}: AssignmentRowProps) {
  return (
    <View style={styles.assignmentRow}>
      <View style={styles.assignmentRowText}>
        <Text style={styles.assignmentRowLabel}>{label}</Text>
        <Text style={styles.assignmentRowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onChange ? (
        <Button title="Change" variant="outline" size="sm" onPress={onChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: touchTargets.comfortable,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'nowrap',
    gap: spacing.sm,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    // NNG / Zebra: keep competing targets spaced to reduce mistaps with gloves
    gap: 12,
    flexShrink: 0,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 280,
    minHeight: touchTargets.min,
  },
  name: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    flexShrink: 1,
  },
  dutyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary,
    flexShrink: 0,
  },
  dutyBadgeActive: {
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dutyBadgeText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  dutyBadgeTextActive: {
    color: colors.primary,
  },
  dutyTime: {
    ...typography.xs,
    color: colors.mutedForeground,
    flexShrink: 0,
  },
  assignmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: touchTargets.min,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 240,
    flexShrink: 1,
  },
  assignmentChipText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    flexShrink: 1,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devicesButtonAttention: {
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning + '80',
  },
  devicesBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  devicesBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#fff',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: touchTargets.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncStatusOk: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
  },
  syncStatusSyncing: {
    backgroundColor: colors.info + '15',
    borderColor: colors.info + '40',
  },
  syncStatusError: {
    backgroundColor: colors.destructive + '15',
    borderColor: colors.destructive + '40',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mutedForeground,
  },
  syncDotOk: {
    backgroundColor: colors.success,
  },
  syncDotError: {
    backgroundColor: colors.destructive,
  },
  syncText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  syncTextOk: {
    color: colors.success,
  },
  syncTextError: {
    color: colors.destructive,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  sheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  sheetSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: touchTargets.comfortable,
  },
  assignmentRowText: {
    flex: 1,
    minWidth: 0,
  },
  assignmentRowLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  assignmentRowValue: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: touchTargets.comfortable,
  },
  deviceRowAttention: {
    backgroundColor: colors.warning + '10',
  },
  deviceIconWrap: {
    width: touchTargets.min,
    height: touchTargets.min,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconWrapOk: {
    backgroundColor: colors.success + '18',
  },
  deviceIconWrapAttention: {
    backgroundColor: colors.destructive + '15',
  },
  deviceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  deviceMeta: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  deviceMetaAttention: {
    color: colors.destructive,
    fontWeight: '600',
  },
  deviceMetaConnecting: {
    color: colors.info,
    fontWeight: '600',
  },
  deviceStatusQuiet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  deviceStatusQuietText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.info,
  },
  deviceStatusConnectedText: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.success,
  },
});
