import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/Button';
import {showToast} from '../components/feedback';
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from '../styles/theme';
import {
  PendingOperation,
  SYNC_TYPE_BY_OPERATION,
  syncService,
} from '../services/syncService';

interface PendingSyncScreenProps {
  username?: string;
  onGoBack: () => void;
}

const SAMPLE_TRANSACTIONS: PendingOperation[] = [
  {
    id: 'sample-wo-1234567',
    type: 'order',
    syncType: 'PostOrderData',
    data: {orderNumber: '1234567', completed: true},
    timestamp: new Date(2026, 8, 10, 20, 2, 5).getTime(),
    retries: 0,
    status: 'pending',
    completedBy: 'jraja',
  },
  {
    id: 'sample-wo-1234568',
    type: 'order',
    syncType: 'PostOrderData',
    data: {orderNumber: '1234568', completed: true},
    timestamp: new Date(2026, 8, 10, 14, 45, 44).getTime(),
    retries: 3,
    status: 'failed',
    completedBy: 'jraja',
    errorMessage:
      'PostOrderData failed: 500 Internal Server Error — transaction rejected by Core.',
  },
];

function formatWorkOrder(data: PendingOperation['data']): string {
  const raw = data?.orderNumber ?? data?.workOrderNumber;
  if (raw == null || raw === '') {
    return 'Work order';
  }
  const number = String(raw).replace(/^WO[-\s#]*/i, '');
  return `WO #${number}`;
}

function formatCompletedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function transactionCountLabel(count: number): string {
  if (count === 1) {
    return '1 transaction pending';
  }
  return `${count} transactions pending`;
}

export const PendingSyncScreen: React.FC<PendingSyncScreenProps> = ({
  username,
  onGoBack,
}) => {
  const [operations, setOperations] = useState<PendingOperation[]>(
    syncService.getPendingOperations(),
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return syncService.onQueueChange(setOperations);
  }, []);

  const rows = useMemo(
    () => (operations.length > 0 ? operations : SAMPLE_TRANSACTIONS),
    [operations],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setOperations(syncService.getPendingOperations());
    showToast('Sync status updated', {type: 'info', title: 'Refresh'});
    setTimeout(() => setRefreshing(false), 250);
  }, []);

  const renderItem: ListRenderItem<PendingOperation> = ({item}) => {
    const failed = item.status === 'failed';
    const completedBy = item.completedBy || username || '—';
    const syncType = item.syncType || SYNC_TYPE_BY_OPERATION[item.type];

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardCopy}>
            <Text style={styles.workOrder}>{formatWorkOrder(item.data)}</Text>
            <Text style={styles.meta}>
              Completed: {formatCompletedAt(item.timestamp)}
            </Text>
            <Text style={styles.meta}>Completed by: {completedBy}</Text>
            <Text style={styles.meta}>Sync type: {syncType}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              failed ? styles.statusFailed : styles.statusPending,
            ]}>
            <Text
              style={[
                styles.statusBadgeText,
                failed ? styles.statusFailedText : styles.statusPendingText,
              ]}>
              {failed ? 'Failed' : 'Pending'}
            </Text>
          </View>
        </View>
        {failed && item.errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{item.errorMessage}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Pending Sync
        </Text>
        <Button title="Back" variant="ghost" size="sm" onPress={onGoBack} />
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.countLabel}>{transactionCountLabel(rows.length)}</Text>
        <Button
          title="Refresh"
          variant="outline"
          size="md"
          onPress={handleRefresh}
          disabled={refreshing}
          loading={refreshing}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions pending</Text>
            <Text style={styles.emptyBody}>
              Completed work orders appear here until Core acknowledges the sync.
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTitle: {
    ...typography['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countLabel: {
    ...typography.base,
    color: colors.mutedForeground,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  workOrder: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  meta: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  statusPending: {
    backgroundColor: colors.warning,
  },
  statusFailed: {
    backgroundColor: colors.destructive,
  },
  statusBadgeText: {
    ...typography.sm,
    fontWeight: '700',
  },
  statusPendingText: {
    color: colors.primaryForeground,
  },
  statusFailedText: {
    color: colors.destructiveForeground,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.sm,
    color: colors.destructive,
    fontWeight: '500',
  },
  empty: {
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyBody: {
    ...typography.base,
    color: colors.mutedForeground,
    maxWidth: 560,
  },
});

export default PendingSyncScreen;
