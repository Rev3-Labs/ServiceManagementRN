import {safeAsyncStorage} from '../utils/storage';


export interface TimeTrackingRecord {
  orderNumber: string;
  startTime: number; // Unix timestamp in milliseconds
  endTime?: number; // Unix timestamp in milliseconds (undefined if still active)
  duration?: number; // Duration in milliseconds (calculated when completed)
  truckId?: string; // Truck ID at time of service
  username?: string; // Username at time of service
}

const TIME_TRACKING_KEY_PREFIX = 'time_tracking_';
const ACTIVE_TRACKING_KEY = 'active_time_tracking';

/**
 * Start time tracking for an order
 * @param orderNumber - The order number to track
 * @param truckId - Optional truck ID
 * @param username - Optional username
 */
export const startTimeTracking = async (
  orderNumber: string,
  truckId?: string,
  username?: string,
): Promise<void> => {
  try {
    const startTime = Date.now();
    const record: TimeTrackingRecord = {
      orderNumber,
      startTime,
      truckId,
      username,
    };

    // Store active tracking
    await safeAsyncStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(record));

    // Also store in order-specific key for persistence
    const orderKey = `${TIME_TRACKING_KEY_PREFIX}${orderNumber}`;
    await safeAsyncStorage.setItem(orderKey, JSON.stringify(record));
  } catch (error) {
    console.error('Error starting time tracking:', error);
    throw error;
  }
};

/**
 * Stop time tracking for an order and calculate duration
 * @param orderNumber - The order number to stop tracking
 * @returns The completed time tracking record
 */
export const stopTimeTracking = async (
  orderNumber: string,
): Promise<TimeTrackingRecord | null> => {
  try {
    const orderKey = `${TIME_TRACKING_KEY_PREFIX}${orderNumber}`;
    const stored = await safeAsyncStorage.getItem(orderKey);

    if (!stored) {
      console.warn(`No time tracking record found for order ${orderNumber}`);
      return null;
    }

    const record: TimeTrackingRecord = JSON.parse(stored);
    const endTime = Date.now();
    const duration = endTime - record.startTime;

    const completedRecord: TimeTrackingRecord = {
      ...record,
      endTime,
      duration,
    };

    // Update stored record
    await safeAsyncStorage.setItem(orderKey, JSON.stringify(completedRecord));

    // Clear active tracking if this was the active order
    const activeTracking = await safeAsyncStorage.getItem(ACTIVE_TRACKING_KEY);
    if (activeTracking) {
      const active: TimeTrackingRecord = JSON.parse(activeTracking);
      if (active.orderNumber === orderNumber) {
        await safeAsyncStorage.removeItem(ACTIVE_TRACKING_KEY);
      }
    }

    return completedRecord;
  } catch (error) {
    console.error('Error stopping time tracking:', error);
    throw error;
  }
};

/**
 * Get the currently active time tracking record
 * @returns The active time tracking record or null
 */
export const getActiveTimeTracking = async (): Promise<TimeTrackingRecord | null> => {
  try {
    const stored = await safeAsyncStorage.getItem(ACTIVE_TRACKING_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting active time tracking:', error);
    return null;
  }
};

/**
 * Get time tracking record for a specific order
 * @param orderNumber - The order number
 * @returns The time tracking record or null
 */
export const getTimeTrackingForOrder = async (
  orderNumber: string,
): Promise<TimeTrackingRecord | null> => {
  try {
    const orderKey = `${TIME_TRACKING_KEY_PREFIX}${orderNumber}`;
    const stored = await safeAsyncStorage.getItem(orderKey);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting time tracking for order:', error);
    return null;
  }
};

/**
 * Calculate elapsed time in a human-readable format
 * @param startTime - Start timestamp in milliseconds
 * @returns Formatted string like "2h 15m" or "45m" or "5m"
 */
export const formatElapsedTime = (startTime: number): string => {
  const now = Date.now();
  const elapsed = now - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '<1m';
};

/**
 * Format duration in milliseconds to human-readable format
 * @param duration - Duration in milliseconds
 * @returns Formatted string like "2h 15m"
 */
export const formatDuration = (duration: number): string => {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '<1m';
};

/**
 * Get all completed time tracking records (for future sync to database)
 * @returns Array of completed time tracking records
 */
export const getAllCompletedTimeTracking = async (): Promise<TimeTrackingRecord[]> => {
  try {
    // This would need to iterate through all keys in a real implementation
    // For now, we'll store completed records separately or query by pattern
    // This is a placeholder for future database sync
    return [];
  } catch (error) {
    console.error('Error getting all completed time tracking:', error);
    return [];
  }
};
