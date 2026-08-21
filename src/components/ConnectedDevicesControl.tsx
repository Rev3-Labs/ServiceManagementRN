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
  StyleProp,
  ViewStyle,
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
import {
  ConnectedDevice,
  deviceStatusService,
  formatDeviceLastUpdated,
  formatDeviceStatusLabel,
} from '../services/deviceStatusService';

function getStatusIconColor(status: ConnectedDevice['status']): string {
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

export interface ConnectedDevicesControlProps {
  /** Optional style override for the trigger button. */
  buttonStyle?: StyleProp<ViewStyle>;
}

/**
 * Devices header icon + Connected devices sheet.
 * Shared by dashboard chrome and PersistentOrderHeader so it stays available
 * throughout the service request flow.
 */
export const ConnectedDevicesControl: React.FC<
  ConnectedDevicesControlProps
> = ({buttonStyle}) => {
  const [showDevicesSheet, setShowDevicesSheet] = useState(false);
  const [devices, setDevices] = useState<ConnectedDevice[]>(
    deviceStatusService.getDevices(),
  );
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  useEffect(() => deviceStatusService.onDevicesChange(setDevices), []);

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

  return (
    <>
      <TouchableOpacity
        style={[
          styles.iconButton,
          buttonStyle,
          devicesNeedAttention && styles.devicesButtonAttention,
        ]}
        onPress={() => setShowDevicesSheet(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          devicesNeedAttention
            ? `${disconnectedCount} device${
                disconnectedCount !== 1 ? 's' : ''
              } disconnected`
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
              {devices.map(device => {
                const isReconnecting = reconnectingId === device.id;
                const isConnecting =
                  isReconnecting || device.status === 'connecting';
                const canReconnect =
                  device.status === 'disconnected' ||
                  device.status === 'unavailable';
                const needsAttention =
                  device.status === 'disconnected' ||
                  device.status === 'unavailable';
                const statusLabel = formatDeviceStatusLabel(device.status);
                const meta =
                  needsAttention || isConnecting
                    ? statusLabel
                    : `Updated ${formatDeviceLastUpdated(device.lastUpdated)}`;

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
                        {meta}
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
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  devicesButtonAttention: {
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning + '80',
  },
  devicesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  devicesBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
