import {safeAsyncStorage} from '../utils/storage';

const SERVICE_NOTES_ACK_KEY = '@service_notes_acknowledgments';

type Listener = () => void;

class ServiceNotesAckService {
  private acks: Set<string> = new Set();
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
        if (Array.isArray(parsed)) {
          parsed.forEach((key) => {
            if (typeof key === 'string') this.acks.add(key);
          });
        } else if (parsed && typeof parsed === 'object') {
          // Backwards-compat with prior object-shaped storage.
          Object.keys(parsed).forEach((key) => this.acks.add(key));
        }
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
      await safeAsyncStorage.setItem(
        SERVICE_NOTES_ACK_KEY,
        JSON.stringify(Array.from(this.acks)),
      );
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
   * Mark service notes as acknowledged for an order.
   */
  async acknowledge(orderNumber: string): Promise<void> {
    this.acks.add(orderNumber);
    await this.saveAcks();
    this.notify();
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
