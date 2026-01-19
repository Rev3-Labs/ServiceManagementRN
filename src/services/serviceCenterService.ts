import {safeAsyncStorage} from '../utils/storage';

const SERVICE_CENTER_KEY = '@service_center';
const SERVICE_CENTER_UPDATE_TIME_KEY = '@service_center_update_time';

export interface ServiceCenter {
  name: string;
  abbreviation?: string;
  address?: string;
  lastUpdated: number;
}

export type ServiceCenterListener = (serviceCenter: ServiceCenter | null) => void;

class ServiceCenterService {
  private currentServiceCenter: ServiceCenter | null = null;
  private listeners: ServiceCenterListener[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadServiceCenter();
    // If no Service Center is set, initialize with a default for testing
    if (!this.currentServiceCenter) {
      // Set a default Service Center for testing/demo
      await this.setServiceCenter(
        'Dallas Service Center',
        'DAL',
        '1234 Main Street, Dallas, TX 75201'
      );
    }
  }

  private async loadServiceCenter() {
    try {
      const stored = await safeAsyncStorage.getItem(SERVICE_CENTER_KEY);
      const updateTime = await safeAsyncStorage.getItem(SERVICE_CENTER_UPDATE_TIME_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        this.currentServiceCenter = {
          ...parsed,
          lastUpdated: updateTime ? parseInt(updateTime, 10) : Date.now(),
        };
      }
    } catch (error) {
      console.error('[ServiceCenterService] Error loading service center:', error);
      this.currentServiceCenter = null;
    }
  }

  private async saveServiceCenter(serviceCenter: ServiceCenter) {
    try {
      await safeAsyncStorage.setItem(SERVICE_CENTER_KEY, JSON.stringify({
        name: serviceCenter.name,
        abbreviation: serviceCenter.abbreviation,
        address: serviceCenter.address,
      }));
      await safeAsyncStorage.setItem(
        SERVICE_CENTER_UPDATE_TIME_KEY,
        serviceCenter.lastUpdated.toString(),
      );
    } catch (error) {
      console.error('[ServiceCenterService] Error saving service center:', error);
    }
  }

  /**
   * Get current Service Center
   */
  getServiceCenter(): ServiceCenter | null {
    return this.currentServiceCenter;
  }

  /**
   * Set Service Center (typically called after sync)
   * Returns true if Service Center changed
   */
  async setServiceCenter(
    name: string,
    abbreviation?: string,
    address?: string,
  ): Promise<boolean> {
    const wasChanged = 
      this.currentServiceCenter?.name !== name ||
      this.currentServiceCenter?.abbreviation !== abbreviation ||
      this.currentServiceCenter?.address !== address;

    const newServiceCenter: ServiceCenter = {
      name,
      abbreviation,
      address,
      lastUpdated: Date.now(),
    };

    this.currentServiceCenter = newServiceCenter;
    await this.saveServiceCenter(newServiceCenter);
    this.notifyListeners();

    return wasChanged;
  }

  /**
   * Get display format (full or compact)
   */
  getDisplayFormat(compact: boolean = false): string {
    if (!this.currentServiceCenter) {
      return 'No Service Center';
    }

    if (compact) {
      // Use abbreviation if available, otherwise shorten name
      if (this.currentServiceCenter.abbreviation) {
        return this.currentServiceCenter.abbreviation;
      }
      // Try to extract abbreviation from name (e.g., "Dallas Service Center" -> "Dallas SC")
      const nameParts = this.currentServiceCenter.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0]} SC`;
      }
      return this.currentServiceCenter.name;
    }

    return this.currentServiceCenter.name;
  }

  /**
   * Format last update date
   */
  formatLastUpdate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: true})}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', hour12: true})}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentServiceCenter));
  }

  /**
   * Subscribe to Service Center changes
   */
  onServiceCenterChange(listener: ServiceCenterListener): () => void {
    this.listeners.push(listener);
    // Immediately call with current service center
    listener(this.currentServiceCenter);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear Service Center (for logout)
   */
  async clearServiceCenter(): Promise<void> {
    this.currentServiceCenter = null;
    try {
      await safeAsyncStorage.removeItem(SERVICE_CENTER_KEY);
      await safeAsyncStorage.removeItem(SERVICE_CENTER_UPDATE_TIME_KEY);
    } catch (error) {
      console.error('[ServiceCenterService] Error clearing service center:', error);
    }
    this.notifyListeners();
  }
}

// Export singleton instance
export const serviceCenterService = new ServiceCenterService();
