import {safeAsyncStorage} from '../utils/storage';

// Mock network state - assume always online (NetInfo not working)
console.log('[SyncService] Using mock network state (always online)');

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export interface PendingOperation {
  id: string;
  type: 'container' | 'order' | 'manifest' | 'materials';
  data: any;
  timestamp: number;
  retries: number;
}

const PENDING_OPERATIONS_KEY = '@pending_operations';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

class SyncService {
  private syncStatus: SyncStatus = 'synced';
  private pendingOperations: PendingOperation[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private statusListeners: Array<(status: SyncStatus) => void> = [];
  private isOnline: boolean = true;

  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load pending operations from storage
    await this.loadPendingOperations();
    
    // Mock network state - assume always online (NetInfo not working)
    this.isOnline = true;
    console.log('[SyncService] Network state: always online (mocked)');

    // Start periodic sync
    this.startPeriodicSync();
  }

  private async loadPendingOperations() {
    try {
      const stored = await safeAsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
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

  private setSyncStatus(status: SyncStatus) {
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
      if (this.isOnline && this.pendingOperations.length > 0) {
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
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.pendingOperations.push(operation);
    await this.savePendingOperations();
    this.updateSyncStatus();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingOperations();
    }

    return operation.id;
  }

  // Remove a pending operation (after successful sync)
  private async removePendingOperation(id: string) {
    this.pendingOperations = this.pendingOperations.filter(
      op => op.id !== id,
    );
    await this.savePendingOperations();
    this.updateSyncStatus();
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    this.setSyncStatus('syncing');

    const operationsToSync = [...this.pendingOperations];
    const results: Array<{id: string; success: boolean}> = [];

    for (const operation of operationsToSync) {
      try {
        const success = await this.syncOperation(operation);
        results.push({id: operation.id, success});
        
        if (success) {
          await this.removePendingOperation(operation.id);
        } else {
          // Increment retry count
          operation.retries += 1;
          if (operation.retries >= MAX_RETRIES) {
            // Mark as failed after max retries
            await this.removePendingOperation(operation.id);
            console.error(`Operation ${operation.id} failed after ${MAX_RETRIES} retries`);
          }
        }
      } catch (error) {
        console.error(`Error syncing operation ${operation.id}:`, error);
        operation.retries += 1;
        if (operation.retries >= MAX_RETRIES) {
          await this.removePendingOperation(operation.id);
        }
      }
    }

    await this.savePendingOperations();
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

  // Manual sync trigger
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await this.syncPendingOperations();
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // Get pending operations count
  getPendingCount(): number {
    return this.pendingOperations.length;
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

