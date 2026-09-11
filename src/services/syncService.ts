import {safeAsyncStorage} from '../utils/storage';
import {offlineTrackingService} from './offlineTrackingService';
import NetInfo from '@react-native-community/netinfo';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export type PendingOperationType = 'container' | 'order' | 'manifest' | 'materials';
export type PendingTransactionStatus = 'pending' | 'failed';

export const SYNC_TYPE_BY_OPERATION: Record<PendingOperationType, string> = {
  order: 'PostOrderData',
  container: 'PostContainerData',
  manifest: 'PostManifestData',
  materials: 'PostMaterialsData',
};

export interface PendingOperation {
  id: string;
  type: PendingOperationType;
  /** Core API / sync method name, e.g. PostOrderData. */
  syncType: string;
  data: any;
  timestamp: number;
  retries: number;
  status: PendingTransactionStatus;
  errorMessage?: string;
  completedBy?: string;
  /** Debug-only: stay in the queue until an explicit sync from Pending Sync. */
  debugHold?: boolean;
}

const PENDING_OPERATIONS_KEY = '@pending_operations';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

function normalizePendingOperation(op: PendingOperation): PendingOperation {
  return {
    ...op,
    data: op.data,
    syncType: op.syncType || SYNC_TYPE_BY_OPERATION[op.type] || 'PostOrderData',
    status: op.status || (op.retries >= MAX_RETRIES ? 'failed' : 'pending'),
  };
}

class SyncService {
  private syncStatus: SyncStatus = 'synced';
  private pendingOperations: PendingOperation[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private statusListeners: Array<(status: SyncStatus) => void> = [];
  private queueListeners: Array<(operations: PendingOperation[]) => void> = [];
  private isOnline: boolean = true;

  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load pending operations from storage
    await this.loadPendingOperations();

    // Subscribe to network state for offline/error feedback (e.g. Airplane Mode)
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      this.isOnline = (state.isConnected ?? false) && state.type !== 'none';
      this.updateSyncStatus();
    });

    // Start periodic sync
    this.startPeriodicSync();
  }

  private async loadPendingOperations() {
    try {
      const stored = await safeAsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      if (stored) {
        this.pendingOperations = JSON.parse(stored).map(normalizePendingOperation);
      }
      this.notifyQueue();
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }

  private notifyQueue() {
    const snapshot = this.getPendingOperations();
    this.queueListeners.forEach(listener => listener(snapshot));
  }

  private async savePendingOperations() {
    try {
      await safeAsyncStorage.setItem(
        PENDING_OPERATIONS_KEY,
        JSON.stringify(this.pendingOperations),
      );
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  private updateSyncStatus() {
    if (!this.isOnline) {
      this.setSyncStatus('offline');
    } else if (this.pendingOperations.length > 0) {
      this.setSyncStatus('pending');
    } else {
      this.setSyncStatus('synced');
    }
  }

  setSyncStatus(status: SyncStatus) {
    if (this.syncStatus !== status) {
      this.syncStatus = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      const readyCount = this.pendingOperations.filter(op => !op.debugHold).length;
      if (this.isOnline && readyCount > 0) {
        this.syncPendingOperations();
      }
    }, SYNC_INTERVAL);
  }

  // Add a pending operation to the queue
  async addPendingOperation(
    type: PendingOperation['type'],
    data: any,
  ): Promise<string> {
    const operation: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      syncType: SYNC_TYPE_BY_OPERATION[type],
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      completedBy:
        typeof data?.completedBy === 'string' ? data.completedBy : undefined,
    };

    this.pendingOperations.push(operation);
    await this.savePendingOperations();
    this.notifyQueue();
    this.updateSyncStatus();

    // Try to sync immediately if online
    if (this.isOnline && !operation.debugHold) {
      this.syncPendingOperations();
    }

    return operation.id;
  }

  async seedDebugPendingOperations(): Promise<number> {
    const samples: Array<Omit<PendingOperation, 'id'>> = [
      {
        type: 'order',
        syncType: 'PostOrderData',
        data: {orderNumber: '1234567', completed: true},
        timestamp: new Date(2026, 8, 10, 20, 2, 5).getTime(),
        retries: 0,
        status: 'pending',
        completedBy: 'jraja',
        debugHold: true,
      },
      {
        type: 'order',
        syncType: 'PostOrderData',
        data: {orderNumber: '1234568', completed: true},
        timestamp: new Date(2026, 8, 10, 14, 45, 44).getTime(),
        retries: 3,
        status: 'failed',
        completedBy: 'jraja',
        errorMessage:
          'PostOrderData failed: 500 Internal Server Error — transaction rejected by Core.',
        debugHold: true,
      },
      {
        type: 'container',
        syncType: 'PostContainerData',
        data: {orderNumber: '1234567', containerId: 'C-2291', action: 'save'},
        timestamp: new Date(2026, 8, 10, 19, 48, 12).getTime(),
        retries: 0,
        status: 'pending',
        completedBy: 'jraja',
        debugHold: true,
      },
    ];

    for (const sample of samples) {
      this.pendingOperations.push({
        ...sample,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    await this.savePendingOperations();
    this.notifyQueue();
    this.updateSyncStatus();
    return samples.length;
  }

  // Remove a pending operation (after successful sync)
  private async removePendingOperation(id: string) {
    this.pendingOperations = this.pendingOperations.filter(
      op => op.id !== id,
    );
    await this.savePendingOperations();
    this.notifyQueue();
    this.updateSyncStatus();
  }

  async discardPendingOperation(id: string): Promise<void> {
    await this.removePendingOperation(id);
  }

  // Sync all pending operations
  async syncPendingOperations(options?: {includeHeld?: boolean}): Promise<void> {
    const includeHeld = options?.includeHeld === true;
    const operationsToSync = this.pendingOperations.filter(
      op =>
        op.status !== 'failed' && (includeHeld || !op.debugHold),
    );
    if (!this.isOnline || operationsToSync.length === 0) {
      return;
    }

    if (includeHeld) {
      operationsToSync.forEach(op => {
        op.debugHold = false;
      });
    }

    this.setSyncStatus('syncing');
    const results: Array<{id: string; success: boolean}> = [];

    for (const operation of operationsToSync) {
      try {
        const success = await this.syncOperation(operation);
        results.push({id: operation.id, success});
        
        if (success) {
          await this.removePendingOperation(operation.id);
          // Notify offline tracking service of successful sync
          await offlineTrackingService.onSyncComplete();
        } else {
          // Increment retry count
          operation.retries += 1;
          if (operation.retries >= MAX_RETRIES) {
            operation.status = 'failed';
            operation.errorMessage = `${operation.syncType} failed: 500 Internal Server Error — transaction rejected by Core.`;
            console.error(`Operation ${operation.id} failed after ${MAX_RETRIES} retries`);
          }
        }
      } catch (error) {
        console.error(`Error syncing operation ${operation.id}:`, error);
        operation.retries += 1;
        if (operation.retries >= MAX_RETRIES) {
          operation.status = 'failed';
          operation.errorMessage =
            error instanceof Error
              ? `${operation.syncType} failed: ${error.message}`
              : `${operation.syncType} failed after ${MAX_RETRIES} retries`;
        }
      }
    }

    await this.savePendingOperations();
    this.notifyQueue();
    this.updateSyncStatus();
  }

  // Sync a single operation (mock API call - replace with actual API)
  private async syncOperation(operation: PendingOperation): Promise<boolean> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 90% success rate for demo
        const success = Math.random() > 0.1;
        resolve(success);
      }, 1000);
    });

    // In production, replace with actual API call:
    // try {
    //   const response = await fetch(`${API_BASE_URL}/sync`, {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({
    //       type: operation.type,
    //       data: operation.data,
    //     }),
    //   });
    //   return response.ok;
    // } catch (error) {
    //   return false;
    // }
  }

  // Manual sync trigger (FR-5.0.2: on-demand bi-directional sync)
  async manualSync(): Promise<void> {
    this.setSyncStatus('syncing');
    if (!this.isOnline) {
      this.setSyncStatus('error');
      throw new Error('Connection failed. Please check your network.');
    }
    try {
      await this.syncPendingOperations();
    } catch (e) {
      this.setSyncStatus('error');
      throw e;
    }
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // Get pending operations count
  getPendingCount(): number {
    return this.pendingOperations.length;
  }

  getPendingOperations(): PendingOperation[] {
    return this.pendingOperations.map(op => normalizePendingOperation(op));
  }

  onQueueChange(
    listener: (operations: PendingOperation[]) => void,
  ): () => void {
    this.queueListeners.push(listener);
    listener(this.getPendingOperations());
    return () => {
      this.queueListeners = this.queueListeners.filter(item => item !== listener);
    };
  }

  // Subscribe to status changes
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    // Immediately call with current status
    listener(this.syncStatus);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  // Check if online
  isConnected(): boolean {
    return this.isOnline;
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

