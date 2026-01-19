import NetInfo from '@react-native-community/netinfo';
import {safeAsyncStorage} from '../utils/storage';

const OFFLINE_START_TIME_KEY = '@offline_start_time';
const LAST_SYNC_TIME_KEY = '@last_sync_time';
const OFFLINE_DURATION_LIMIT_MS = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
const WARNING_THRESHOLD_8H = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_THRESHOLD_9H = 9 * 60 * 60 * 1000; // 9 hours
const WARNING_THRESHOLD_9_5H = 9.5 * 60 * 60 * 1000; // 9.5 hours

export interface OfflineStatus {
  isOnline: boolean;
  offlineDurationMs: number;
  offlineDurationFormatted: string;
  lastSyncTime: number | null;
  lastSyncFormatted: string;
  warningLevel: 'none' | 'warning' | 'orange' | 'critical' | 'blocked';
  isBlocked: boolean;
}

export type OfflineStatusListener = (status: OfflineStatus) => void;

class OfflineTrackingService {
  private offlineStartTime: number | null = null;
  private lastSyncTime: number | null = null;
  private isOnline: boolean = true;
  private statusListeners: OfflineStatusListener[] = [];
  private netInfoUnsubscribe: (() => void) | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean = false;
  private debugOfflineDuration: number | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load persisted state
    await this.loadPersistedState();

    // Set up NetInfo listener
    this.setupNetInfoListener();

    // Start update interval (update every minute)
    this.startUpdateInterval();

    // Check initial state
    const state = await NetInfo.fetch();
    this.handleConnectivityChange(state.isConnected ?? false);
  }

  private async loadPersistedState() {
    try {
      const offlineStart = await safeAsyncStorage.getItem(OFFLINE_START_TIME_KEY);
      const lastSync = await safeAsyncStorage.getItem(LAST_SYNC_TIME_KEY);

      if (offlineStart) {
        this.offlineStartTime = parseInt(offlineStart, 10);
      }
      if (lastSync) {
        this.lastSyncTime = parseInt(lastSync, 10);
      }
    } catch (error) {
      console.error('[OfflineTracking] Error loading persisted state:', error);
    }
  }

  private async savePersistedState() {
    try {
      if (this.offlineStartTime !== null) {
        await safeAsyncStorage.setItem(
          OFFLINE_START_TIME_KEY,
          this.offlineStartTime.toString(),
        );
      } else {
        await safeAsyncStorage.removeItem(OFFLINE_START_TIME_KEY);
      }

      if (this.lastSyncTime !== null) {
        await safeAsyncStorage.setItem(
          LAST_SYNC_TIME_KEY,
          this.lastSyncTime.toString(),
        );
      }
    } catch (error) {
      console.error('[OfflineTracking] Error saving persisted state:', error);
    }
  }

  private setupNetInfoListener() {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      this.handleConnectivityChange(isConnected);
    });
  }

  private async handleConnectivityChange(isConnected: boolean) {
    const wasOnline = this.isOnline;
    this.isOnline = isConnected;

    if (!wasOnline && isConnected) {
      // Just came back online - don't reset timer yet, wait for sync
      console.log('[OfflineTracking] Device came back online');
    } else if (wasOnline && !isConnected) {
      // Just went offline - start timer
      this.offlineStartTime = Date.now();
      await this.savePersistedState();
      console.log('[OfflineTracking] Device went offline, timer started');
    }

    this.notifyListeners();
  }

  private startUpdateInterval() {
    // Update every minute to refresh duration display
    this.updateInterval = setInterval(() => {
      if (!this.isOnline) {
        this.notifyListeners();
      }
    }, 60000); // 1 minute
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours} hrs ${minutes} min`;
    }
    return `${minutes} min`;
  }

  private formatLastSync(timestamp: number | null): string {
    if (!timestamp) {
      return 'Never';
    }

    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    const syncDate = new Date(timestamp);
    const today = new Date();
    const isToday = 
      syncDate.getDate() === today.getDate() &&
      syncDate.getMonth() === today.getMonth() &&
      syncDate.getFullYear() === today.getFullYear();

    if (isToday) {
      // Show "Today 2:45 PM" format for same day
      return `Today ${syncDate.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: true})}`;
    } else if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hrs ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      // Show absolute date for older syncs
      return syncDate.toLocaleDateString() + ' ' + syncDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
  }

  private getWarningLevel(offlineDurationMs: number): 'none' | 'warning' | 'orange' | 'critical' | 'blocked' {
    if (offlineDurationMs >= OFFLINE_DURATION_LIMIT_MS) {
      return 'blocked';
    } else if (offlineDurationMs >= WARNING_THRESHOLD_9_5H) {
      return 'critical'; // Red critical at 9.5 hours
    } else if (offlineDurationMs >= WARNING_THRESHOLD_9H) {
      return 'orange'; // Orange warning at 9 hours
    } else if (offlineDurationMs >= WARNING_THRESHOLD_8H) {
      return 'warning'; // Yellow warning at 8 hours
    }
    return 'none';
  }

  getStatus(): OfflineStatus {
    let offlineDurationMs = 0;

    if (this.debugMode && this.debugOfflineDuration !== null) {
      // Use debug duration if in debug mode
      offlineDurationMs = this.debugOfflineDuration;
    } else if (!this.isOnline && this.offlineStartTime !== null) {
      offlineDurationMs = Date.now() - this.offlineStartTime;
    }

    const warningLevel = this.getWarningLevel(offlineDurationMs);
    const isBlocked = offlineDurationMs >= OFFLINE_DURATION_LIMIT_MS;

    return {
      isOnline: this.debugMode ? (this.debugOfflineDuration === null) : this.isOnline,
      offlineDurationMs,
      offlineDurationFormatted: this.formatDuration(offlineDurationMs),
      lastSyncTime: this.lastSyncTime,
      lastSyncFormatted: this.formatLastSync(this.lastSyncTime),
      warningLevel,
      isBlocked,
    };
  }

  // Debug methods for testing offline scenarios
  setDebugOfflineDuration(hours: number | null): void {
    this.debugMode = hours !== null;
    if (hours !== null) {
      this.debugOfflineDuration = hours * 60 * 60 * 1000; // Convert hours to milliseconds
    } else {
      this.debugOfflineDuration = null;
    }
    this.notifyListeners();
  }

  resetDebugMode(): void {
    this.debugMode = false;
    this.debugOfflineDuration = null;
    this.notifyListeners();
  }

  // Get current debug duration in hours (for UI feedback)
  getDebugDurationHours(): number | null {
    if (this.debugMode && this.debugOfflineDuration !== null) {
      return this.debugOfflineDuration / (60 * 60 * 1000); // Convert back to hours
    }
    return null;
  }

  // Call this when sync completes successfully
  async onSyncComplete() {
    if (this.isOnline) {
      this.lastSyncTime = Date.now();
      this.offlineStartTime = null; // Reset offline timer
      await this.savePersistedState();
      console.log('[OfflineTracking] Sync completed, timer reset');
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  // Subscribe to status changes
  onStatusChange(listener: OfflineStatusListener): () => void {
    this.statusListeners.push(listener);
    // Immediately call with current status
    listener(this.getStatus());

    // Return unsubscribe function
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  // Cleanup
  destroy() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Export singleton instance
export const offlineTrackingService = new OfflineTrackingService();
