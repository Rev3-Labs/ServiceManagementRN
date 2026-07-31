import React, {useState} from 'react';
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
import {ConnectedDevicesControl} from './ConnectedDevicesControl';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';
import {formatDuration} from '../services/timeTrackingService';
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

  const truckLabel = selectedTruck?.number || truckId || '—';
  const trailerLabel = selectedTrailer?.number || null;
  const assignmentSummary = buildAssignmentSummary(truckLabel, trailerLabel);

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
          <ConnectedDevicesControl />
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
  sheetTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  sheetScroll: {
    flexGrow: 0,
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
});
