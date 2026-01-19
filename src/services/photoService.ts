import {safeAsyncStorage} from '../utils/storage';

const PHOTOS_KEY = '@order_photos';

export type PhotoCategory = 
  | 'waste-item'
  | 'site-condition'
  | 'safety-issue'
  | 'equipment'
  | 'customer-document'
  | 'other';

export interface OrderPhoto {
  id: string;
  uri: string;
  orderNumber: string;
  category: PhotoCategory;
  caption?: string;
  timestamp: string;
  capturedAt: number;
}

export type PhotoListener = (photos: OrderPhoto[]) => void;

class PhotoService {
  private photos: Map<string, OrderPhoto[]> = new Map(); // orderNumber -> photos[]
  private listeners: PhotoListener[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadPhotos();
  }

  private async loadPhotos() {
    try {
      const stored = await safeAsyncStorage.getItem(PHOTOS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert array to Map
        Object.entries(parsed).forEach(([orderNumber, photos]) => {
          this.photos.set(orderNumber, photos as OrderPhoto[]);
        });
      }
    } catch (error) {
      console.error('[PhotoService] Error loading photos:', error);
    }
  }

  private async savePhotos() {
    try {
      const photosObj: Record<string, OrderPhoto[]> = {};
      this.photos.forEach((photos, orderNumber) => {
        photosObj[orderNumber] = photos;
      });
      await safeAsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(photosObj));
    } catch (error) {
      console.error('[PhotoService] Error saving photos:', error);
    }
  }

  /**
   * Get all photos for an order
   */
  getPhotosForOrder(orderNumber: string): OrderPhoto[] {
    return this.photos.get(orderNumber) || [];
  }

  /**
   * Get photo count for an order
   */
  getPhotoCount(orderNumber: string): number {
    return this.getPhotosForOrder(orderNumber).length;
  }

  /**
   * Add a photo to an order
   */
  async addPhoto(
    orderNumber: string,
    uri: string,
    category: PhotoCategory,
    caption?: string,
  ): Promise<OrderPhoto> {
    const photo: OrderPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uri,
      orderNumber,
      category,
      caption,
      timestamp: new Date().toISOString(),
      capturedAt: Date.now(),
    };

    const orderPhotos = this.photos.get(orderNumber) || [];
    orderPhotos.push(photo);
    this.photos.set(orderNumber, orderPhotos);

    await this.savePhotos();
    this.notifyListeners(orderNumber);

    return photo;
  }

  /**
   * Delete a photo
   */
  async deletePhoto(orderNumber: string, photoId: string): Promise<void> {
    const orderPhotos = this.photos.get(orderNumber) || [];
    const filtered = orderPhotos.filter(p => p.id !== photoId);
    
    if (filtered.length === 0) {
      this.photos.delete(orderNumber);
    } else {
      this.photos.set(orderNumber, filtered);
    }

    await this.savePhotos();
    this.notifyListeners(orderNumber);
  }

  /**
   * Update photo metadata
   */
  async updatePhoto(
    orderNumber: string,
    photoId: string,
    updates: Partial<Pick<OrderPhoto, 'category' | 'caption'>>,
  ): Promise<void> {
    const orderPhotos = this.photos.get(orderNumber) || [];
    const photo = orderPhotos.find(p => p.id === photoId);
    
    if (photo) {
      Object.assign(photo, updates);
      await this.savePhotos();
      this.notifyListeners(orderNumber);
    }
  }

  /**
   * Clear photos for an order
   */
  async clearOrderPhotos(orderNumber: string): Promise<void> {
    this.photos.delete(orderNumber);
    await this.savePhotos();
    this.notifyListeners(orderNumber);
  }

  private notifyListeners(orderNumber: string) {
    const photos = this.getPhotosForOrder(orderNumber);
    this.listeners.forEach(listener => listener(photos));
  }

  /**
   * Subscribe to photo changes for an order
   */
  onPhotosChange(
    orderNumber: string,
    listener: PhotoListener,
  ): () => void {
    this.listeners.push(listener);
    // Immediately call with current photos
    listener(this.getPhotosForOrder(orderNumber));

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: PhotoCategory): string {
    const labels: Record<PhotoCategory, string> = {
      'waste-item': 'Waste Item',
      'site-condition': 'Site Condition',
      'safety-issue': 'Safety Issue',
      'equipment': 'Equipment',
      'customer-document': 'Customer Document',
      'other': 'Other',
    };
    return labels[category];
  }
}

// Export singleton instance
export const photoService = new PhotoService();
