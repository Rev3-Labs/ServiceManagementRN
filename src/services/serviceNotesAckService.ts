import {safeAsyncStorage} from '../utils/storage';

const SERVICE_NOTES_ACK_KEY = '@service_notes_acknowledgments';

export interface ServiceNotesAcknowledgment {
  orderNumber: string;
  technicianId?: string;
  acknowledgedAt: number; // epoch ms
}

type Listener = () => void;

class ServiceNotesAckService {
  private acks: Map<string, ServiceNotesAcknowledgment> = new Map();
  private listeners: Set<Listener> = new Set();
  private loaded = false;
  private loadPromise: Promise<void>;

  constructor() {
    this.loadPromise = this.loadAcks();
  }

  private async loadAcks() {
    try {
      const stored = await safeAsyncStorage.getItem(SERVICE_NOTES_ACK_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.acks.set(key, value as ServiceNotesAcknowledgment);
        });
      }
    } catch (error) {
      console.error('[ServiceNotesAckService] Error loading acks:', error);
    } finally {
      this.loaded = true;
      this.notify();
    }
  }

  private async saveAcks() {
    try {
      const obj: Record<string, ServiceNotesAcknowledgment> = {};
      this.acks.forEach((value, key) => {
        obj[key] = value;
      });
      await safeAsyncStorage.setItem(SERVICE_NOTES_ACK_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('[ServiceNotesAckService] Error saving acks:', error);
    }
  }

  /**
   * Returns true if the technician has acknowledged service notes for this order.
   */
  isAcknowledged(orderNumber: string): boolean {
    return this.acks.has(orderNumber);
  }

  /**
   * Returns the full acknowledgment record (or null) for an order.
   */
  getAcknowledgment(orderNumber: string): ServiceNotesAcknowledgment | null {
    return this.acks.get(orderNumber) || null;
  }

  /**
   * Mark service notes as acknowledged for an order.
   */
  async acknowledge(
    orderNumber: string,
    technicianId?: string,
  ): Promise<ServiceNotesAcknowledgment> {
    const ack: ServiceNotesAcknowledgment = {
      orderNumber,
      technicianId,
      acknowledgedAt: Date.now(),
    };
    this.acks.set(orderNumber, ack);
    await this.saveAcks();
    this.notify();
    return ack;
  }

  /**
   * Clear acknowledgment for an order (e.g., when notes are updated).
   */
  async clear(orderNumber: string): Promise<void> {
    if (!this.acks.has(orderNumber)) return;
    this.acks.delete(orderNumber);
    await this.saveAcks();
    this.notify();
  }

  /**
   * Subscribe to acknowledgment changes. Returns an unsubscribe fn.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[ServiceNotesAckService] listener error:', e);
      }
    });
  }

  /**
   * Awaitable readiness — useful at app start to ensure the persisted state is loaded
   * before reading.
   */
  ready(): Promise<void> {
    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const serviceNotesAckService = new ServiceNotesAckService();
