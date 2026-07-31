import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/Button';
import {Icon} from '../components/Icon';
import {Badge} from '../components/Badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../components/Card';
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from '../styles/theme';
import {
  ConnectedDevice,
  DeviceConnectionStatus,
  deviceStatusService,
  formatDeviceLastUpdated,
  formatDeviceStatusLabel,
} from '../services/deviceStatusService';

interface DevicesScreenProps {
  onGoBack?: () => void;
}

function getStatusBadgeVariant(
  status: DeviceConnectionStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'connected':
      return 'default';
    case 'connecting':
      return 'secondary';
    case 'disconnected':
      return 'destructive';
    default:
      return 'outline';
  }
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

const DevicesScreen: React.FC<DevicesScreenProps> = ({onGoBack}) => {
  const [devices, setDevices] = useState<ConnectedDevice[]>(
    deviceStatusService.getDevices(),
  );
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  useEffect(() => deviceStatusService.onDevicesChange(setDevices), []);

  const connectedCount = devices.filter(
    device => device.status === 'connected',
  ).length;

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Connected devices</Text>
          <Text style={styles.headerSubtitle}>
            {connectedCount} of {devices.length} connected
          </Text>
        </View>
        {onGoBack && (
          <Button title="Back" variant="ghost" size="sm" onPress={onGoBack} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Card style={styles.summaryCard}>
          <CardContent>
            <Text style={styles.summaryText}>
              Peripherals typically paired to this device for waste collection.
              Check status here before starting service or when readings fail.
            </Text>
          </CardContent>
        </Card>

        {devices.map(device => {
          const isReconnecting = reconnectingId === device.id;
          const showReconnect = device.status !== 'connected';

          return (
            <Card key={device.id} style={styles.deviceCard}>
              <CardHeader style={styles.deviceCardHeader}>
                <View style={styles.deviceTitleRow}>
                  <View
                    style={[
                      styles.deviceIconWrap,
                      device.status === 'connected' &&
                        styles.deviceIconWrapConnected,
                    ]}>
                    <Icon
                      name={device.icon}
                      size={24}
                      color={getStatusIconColor(device.status)}
                    />
                  </View>
                  <View style={styles.deviceTitleContent}>
                    <CardTitle style={styles.deviceCardTitle}>
                      <CardTitleText>{device.name}</CardTitleText>
                    </CardTitle>
                    {device.detail ? (
                      <Text style={styles.deviceDetail}>{device.detail}</Text>
                    ) : null}
                  </View>
                  <Badge variant={getStatusBadgeVariant(device.status)}>
                    {formatDeviceStatusLabel(device.status)}
                  </Badge>
                </View>
              </CardHeader>
              <CardContent>
                <Text style={styles.deviceDescription}>{device.description}</Text>
                <Text style={styles.deviceMeta}>
                  Last updated {formatDeviceLastUpdated(device.lastUpdated)}
                </Text>
                {showReconnect && (
                  <Button
                    title={
                      isReconnecting || device.status === 'connecting'
                        ? 'Connecting…'
                        : 'Reconnect'
                    }
                    variant="outline"
                    size="sm"
                    disabled={isReconnecting || device.status === 'connecting'}
                    onPress={() => handleReconnect(device)}
                    style={styles.reconnectButton}
                  />
                )}
                {isReconnecting && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.reconnectSpinner}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  headerSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.xs,
  },
  summaryText: {
    ...typography.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  deviceCard: {
    overflow: 'hidden',
  },
  deviceCardHeader: {
    paddingBottom: 0,
  },
  deviceCardTitle: {
    marginBottom: 0,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconWrapConnected: {
    backgroundColor: colors.success + '18',
  },
  deviceTitleContent: {
    flex: 1,
    minWidth: 0,
  },
  deviceDetail: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  deviceDescription: {
    ...typography.sm,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  deviceMeta: {
    ...typography.xs,
    color: colors.mutedForeground,
  },
  reconnectButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  reconnectSpinner: {
    marginTop: spacing.sm,
  },
});

export default DevicesScreen;
