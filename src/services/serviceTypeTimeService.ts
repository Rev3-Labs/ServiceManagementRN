import {safeAsyncStorage} from '../utils/storage';

const SERVICE_TYPE_TIMES_KEY = '@service_type_times';

export type EntryMethod = 'AUTO' | 'MANUAL';

export interface ServiceTypeTimeEntry {
  serviceTypeId: string;
  orderId: string;
  startTime: number | null; // ISO timestamp or null
  endTime: number | null; // ISO timestamp or null
  durationMinutes: number | null; // Calculated duration
  entryMethod: EntryMethod;
  technicianId: string;
  deviceTimestamp: number; // When entry was made
  date?: string; // MM/DD/YYYY format if service spans midnight
}

class ServiceTypeTimeService {
  private timeEntries: Map<string, ServiceTypeTimeEntry> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadTimeEntries();
  }

  private async loadTimeEntries() {
    try {
      const stored = await safeAsyncStorage.getItem(SERVICE_TYPE_TIMES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, entry]) => {
          this.timeEntries.set(key, entry as ServiceTypeTimeEntry);
        });
      }
    } catch (error) {
      console.error('[ServiceTypeTimeService] Error loading time entries:', error);
    }
  }

  private async saveTimeEntries() {
    try {
      const entriesObj: Record<string, ServiceTypeTimeEntry> = {};
      this.timeEntries.forEach((entry, key) => {
        entriesObj[key] = entry;
      });
      await safeAsyncStorage.setItem(SERVICE_TYPE_TIMES_KEY, JSON.stringify(entriesObj));
    } catch (error) {
      console.error('[ServiceTypeTimeService] Error saving time entries:', error);
    }
  }

  private getEntryKey(orderId: string, serviceTypeId: string): string {
    return `${orderId}:${serviceTypeId}`;
  }

  /**
   * Start time tracking for a service type
   */
  async startServiceType(
    orderId: string,
    serviceTypeId: string,
    technicianId: string,
    customTime?: number, // Optional custom start time (for manual entry)
  ): Promise<ServiceTypeTimeEntry> {
    const key = this.getEntryKey(orderId, serviceTypeId);
    const now = customTime || Date.now();
    const entryMethod = customTime ? 'MANUAL' : 'AUTO';

    const entry: ServiceTypeTimeEntry = {
      serviceTypeId,
      orderId,
      startTime: now,
      endTime: null,
      durationMinutes: null,
      entryMethod,
      technicianId,
      deviceTimestamp: Date.now(),
    };

    this.timeEntries.set(key, entry);
    await this.saveTimeEntries();

    return entry;
  }

  /**
   * End time tracking for a service type
   */
  async endServiceType(
    orderId: string,
    serviceTypeId: string,
    customTime?: number, // Optional custom end time (for manual entry)
  ): Promise<ServiceTypeTimeEntry | null> {
    const key = this.getEntryKey(orderId, serviceTypeId);
    const entry = this.timeEntries.get(key);

    if (!entry) {
      console.warn(`[ServiceTypeTimeService] No entry found for ${key}`);
      return null;
    }

    const now = customTime || Date.now();
    const entryMethod = customTime ? 'MANUAL' : 'AUTO';

    // Calculate duration
    const durationMinutes = entry.startTime
      ? Math.round((now - entry.startTime) / (1000 * 60))
      : null;

    const updatedEntry: ServiceTypeTimeEntry = {
      ...entry,
      endTime: now,
      durationMinutes,
      entryMethod: entry.entryMethod === 'AUTO' && !customTime ? 'AUTO' : 'MANUAL',
      deviceTimestamp: Date.now(),
    };

    this.timeEntries.set(key, updatedEntry);
    await this.saveTimeEntries();

    return updatedEntry;
  }

  /**
   * Get time entry for a service type
   */
  getTimeEntry(orderId: string, serviceTypeId: string): ServiceTypeTimeEntry | null {
    const key = this.getEntryKey(orderId, serviceTypeId);
    return this.timeEntries.get(key) || null;
  }

  /**
   * Get all time entries for an order
   */
  getTimeEntriesForOrder(orderId: string): ServiceTypeTimeEntry[] {
    return Array.from(this.timeEntries.values()).filter(
      entry => entry.orderId === orderId,
    );
  }

  /**
   * Update time entry manually
   */
  async updateTimeEntry(
    orderId: string,
    serviceTypeId: string,
    updates: {
      startTime?: number | null;
      endTime?: number | null;
      date?: string;
    },
  ): Promise<ServiceTypeTimeEntry | null> {
    const key = this.getEntryKey(orderId, serviceTypeId);
    const entry = this.timeEntries.get(key);

    if (!entry) {
      console.warn(`[ServiceTypeTimeService] No entry found for ${key}`);
      return null;
    }

    let startTime = updates.startTime !== undefined ? updates.startTime : entry.startTime;
    let endTime = updates.endTime !== undefined ? updates.endTime : entry.endTime;

    // Recalculate duration if times changed
    let durationMinutes = entry.durationMinutes;
    if (startTime && endTime) {
      durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    } else {
      durationMinutes = null;
    }

    const updatedEntry: ServiceTypeTimeEntry = {
      ...entry,
      startTime,
      endTime,
      durationMinutes,
      entryMethod: 'MANUAL',
      deviceTimestamp: Date.now(),
      date: updates.date || entry.date,
    };

    this.timeEntries.set(key, updatedEntry);
    await this.saveTimeEntries();

    return updatedEntry;
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(orderId: string, serviceTypeId: string): Promise<void> {
    const key = this.getEntryKey(orderId, serviceTypeId);
    this.timeEntries.delete(key);
    await this.saveTimeEntries();
  }

  /**
   * Validate time entry
   */
  validateTimeEntry(
    startTime: number | null,
    endTime: number | null,
    orderDate: Date,
    otherEntries: ServiceTypeTimeEntry[],
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = Date.now();

    // End after Start
    if (startTime && endTime && endTime <= startTime) {
      errors.push('End Time must be after Start Time');
    }

    // No future times
    if (startTime && startTime > now) {
      errors.push('Cannot enter future times');
    }
    if (endTime && endTime > now) {
      errors.push('Cannot enter future times');
    }

    // Within order window (order date ± 24 hours)
    if (startTime || endTime) {
      const orderStart = new Date(orderDate);
      orderStart.setHours(0, 0, 0, 0);
      const orderEnd = new Date(orderDate);
      orderEnd.setHours(23, 59, 59, 999);
      orderEnd.setTime(orderEnd.getTime() + 24 * 60 * 60 * 1000); // +24 hours

      if (startTime) {
        const startDate = new Date(startTime);
        if (startDate < orderStart || startDate > orderEnd) {
          errors.push('Time outside valid order window');
        }
      }
      if (endTime) {
        const endDate = new Date(endTime);
        if (endDate < orderStart || endDate > orderEnd) {
          errors.push('Time outside valid order window');
        }
      }
    }

    // Check for overlap with other service types
    if (startTime && endTime) {
      for (const otherEntry of otherEntries) {
        if (
          otherEntry.startTime &&
          otherEntry.endTime &&
          !(
            endTime <= otherEntry.startTime ||
            startTime >= otherEntry.endTime
          )
        ) {
          warnings.push(
            `Service times overlap with ${otherEntry.serviceTypeId}`,
          );
        }
      }
    }

    // Maximum duration warning (> 8 hours)
    if (startTime && endTime) {
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      if (durationHours > 8) {
        warnings.push(
          'Service duration exceeds 8 hours. Please verify.',
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format duration as "X hrs Y min"
   */
  formatDuration(minutes: number | null): string {
    if (minutes === null || minutes === 0) {
      return '0 min';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    } else {
      return `${mins} min${mins !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Format time as HH:MM AM/PM
   */
  formatTime(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format date as MM/DD/YYYY
   */
  formatDate(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Get total duration for all service types in an order
   */
  getTotalDurationForOrder(orderId: string): number {
    const entries = this.getTimeEntriesForOrder(orderId);
    return entries.reduce((total, entry) => {
      return total + (entry.durationMinutes || 0);
    }, 0);
  }
}

// Export singleton instance
export const serviceTypeTimeService = new ServiceTypeTimeService();
