import {safeAsyncStorage} from '../utils/storage';

const PHOTOS_KEY = '@order_photos';

export type PhotoCategory =
  | 'before-service'
  | 'after-service'
  | 'bol'
  | 'manifest'
  | 'ldr'
  | 'site-condition'
  | 'safety-issue'
  | 'other';

export type PhotoCategoryGroupId =
  | 'service-milestone'
  | 'shipping-documents'
  | 'field-documentation';

export type PhotoRequirement = 'start' | 'closeout';

export interface PhotoCategoryDefinition {
  category: PhotoCategory;
  label: string;
  icon: string;
  group: PhotoCategoryGroupId;
  requirement?: PhotoRequirement;
  /** When set, caps how many photos may be saved for this category per order. */
  maxPhotos?: number;
  description: string;
}

export const PHOTO_CATEGORY_GROUPS: ReadonlyArray<{
  id: PhotoCategoryGroupId;
  title: string;
}> = [
  {
    id: 'service-milestone',
    title: 'Service milestones',
  },
  {
    id: 'shipping-documents',
    title: 'Shipping documents',
  },
  {
    id: 'field-documentation',
    title: 'Site documentation',
  },
];

export const PHOTO_CATEGORY_DEFINITIONS: ReadonlyArray<PhotoCategoryDefinition> =
  [
    {
      category: 'before-service',
      label: 'Before Service',
      icon: 'camera-alt',
      group: 'service-milestone',
      requirement: 'start',
      maxPhotos: 2,
      description: 'Site condition before work begins',
    },
    {
      category: 'after-service',
      label: 'After Service',
      icon: 'camera-alt',
      group: 'service-milestone',
      maxPhotos: 2,
      description: 'Site condition after work is complete',
    },
    {
      category: 'manifest',
      label: 'Manifest',
      icon: 'description',
      group: 'shipping-documents',
      requirement: 'closeout',
      description: 'Hazardous waste manifest',
    },
    {
      category: 'bol',
      label: 'BOL',
      icon: 'local-shipping',
      group: 'shipping-documents',
      requirement: 'closeout',
      description: 'Bill of lading',
    },
    {
      category: 'ldr',
      label: 'LDR',
      icon: 'article',
      group: 'shipping-documents',
      requirement: 'closeout',
      description: 'Land disposal restriction form',
    },
    {
      category: 'site-condition',
      label: 'Site Condition',
      icon: 'home',
      group: 'field-documentation',
      description: 'General site or work-area conditions',
    },
    {
      category: 'safety-issue',
      label: 'Safety Issue',
      icon: 'warning',
      group: 'field-documentation',
      description: 'Hazards, incidents, or safety concerns',
    },
    {
      category: 'other',
      label: 'Other',
      icon: 'folder',
      group: 'field-documentation',
      description: 'Any other job-related photo',
    },
  ];

/** @deprecated Use PHOTO_CATEGORY_DEFINITIONS */
export const PHOTO_CATEGORY_OPTIONS = PHOTO_CATEGORY_DEFINITIONS.map(
  ({category, label, icon}) => ({category, label, icon}),
);

const LEGACY_CATEGORY_MAP: Record<string, PhotoCategory> = {
  'waste-item': 'other',
  equipment: 'other',
  'customer-document': 'other',
};

const isPhotoCategory = (value: string): value is PhotoCategory =>
  PHOTO_CATEGORY_DEFINITIONS.some(d => d.category === value);

const normalizeCategory = (value: string): PhotoCategory => {
  if (isPhotoCategory(value)) return value;
  return LEGACY_CATEGORY_MAP[value] ?? 'other';
};

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

type ListenerEntry = {orderNumber: string; listener: PhotoListener};

class PhotoService {
  private photos: Map<string, OrderPhoto[]> = new Map();
  private listenerEntries: ListenerEntry[] = [];

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
        const parsed = JSON.parse(stored) as Record<string, OrderPhoto[]>;
        Object.entries(parsed).forEach(([orderNumber, orderPhotos]) => {
          this.photos.set(
            orderNumber,
            orderPhotos.map(photo => ({
              ...photo,
              category: normalizeCategory(photo.category),
            })),
          );
        });
      }
    } catch (error) {
      console.error('[PhotoService] Error loading photos:', error);
    }
  }

  private async savePhotos() {
    try {
      const photosObj: Record<string, OrderPhoto[]> = {};
      this.photos.forEach((orderPhotos, orderNumber) => {
        photosObj[orderNumber] = orderPhotos;
      });
      await safeAsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(photosObj));
    } catch (error) {
      console.error('[PhotoService] Error saving photos:', error);
    }
  }

  getPhotosForOrder(orderNumber: string): OrderPhoto[] {
    return this.photos.get(orderNumber) || [];
  }

  getPhotoCount(orderNumber: string): number {
    return this.getPhotosForOrder(orderNumber).length;
  }

  getPhotoCountForCategory(
    orderNumber: string,
    category: PhotoCategory,
  ): number {
    return this.getPhotosForOrder(orderNumber).filter(
      p => p.category === category,
    ).length;
  }

  hasCategoryPhoto(orderNumber: string, category: PhotoCategory): boolean {
    return this.getPhotoCountForCategory(orderNumber, category) > 0;
  }

  hasBeforeServicePhoto(orderNumber: string): boolean {
    return this.hasCategoryPhoto(orderNumber, 'before-service');
  }

  hasAfterServicePhoto(orderNumber: string): boolean {
    return this.hasCategoryPhoto(orderNumber, 'after-service');
  }

  getMissingServiceMilestonePhotoCategories(
    orderNumber: string,
  ): PhotoCategory[] {
    const missing: PhotoCategory[] = [];
    if (!this.hasBeforeServicePhoto(orderNumber)) {
      missing.push('before-service');
    }
    if (!this.hasAfterServicePhoto(orderNumber)) {
      missing.push('after-service');
    }
    return missing;
  }

  getShippingDocumentCategories(): PhotoCategory[] {
    return PHOTO_CATEGORY_DEFINITIONS.filter(
      d => d.group === 'shipping-documents',
    ).map(d => d.category);
  }

  getMissingShippingDocumentCategories(orderNumber: string): PhotoCategory[] {
    return this.getShippingDocumentCategories().filter(
      category => !this.hasCategoryPhoto(orderNumber, category),
    );
  }

  hasAllShippingDocumentPhotos(orderNumber: string): boolean {
    return this.getMissingShippingDocumentCategories(orderNumber).length === 0;
  }

  getCloseoutRequiredCategories(): PhotoCategory[] {
    return PHOTO_CATEGORY_DEFINITIONS.filter(d => d.requirement === 'closeout')
      .map(d => d.category);
  }

  getMissingCloseoutPhotoCategories(orderNumber: string): PhotoCategory[] {
    return this.getCloseoutRequiredCategories().filter(
      category => !this.hasCategoryPhoto(orderNumber, category),
    );
  }

  hasAllCloseoutRequiredPhotos(orderNumber: string): boolean {
    return this.getMissingCloseoutPhotoCategories(orderNumber).length === 0;
  }

  getCategoryDefinition(category: PhotoCategory): PhotoCategoryDefinition {
    const definition = PHOTO_CATEGORY_DEFINITIONS.find(
      d => d.category === category,
    );
    if (!definition) {
      throw new Error(`Unknown photo category: ${category}`);
    }
    return definition;
  }

  getDefinitionsForGroup(
    groupId: PhotoCategoryGroupId,
  ): PhotoCategoryDefinition[] {
    return PHOTO_CATEGORY_DEFINITIONS.filter(d => d.group === groupId);
  }

  getMaxPhotosForCategory(category: PhotoCategory): number | undefined {
    return this.getCategoryDefinition(category).maxPhotos;
  }

  canAddPhotoToCategory(
    orderNumber: string,
    category: PhotoCategory,
    excludePhotoId?: string,
  ): boolean {
    const max = this.getMaxPhotosForCategory(category);
    if (max == null) return true;
    const count = this.getPhotosForOrder(orderNumber).filter(
      p => p.category === category && p.id !== excludePhotoId,
    ).length;
    return count < max;
  }

  async addPhoto(
    orderNumber: string,
    uri: string,
    category: PhotoCategory,
    caption?: string,
  ): Promise<OrderPhoto> {
    if (!this.canAddPhotoToCategory(orderNumber, category)) {
      const max = this.getMaxPhotosForCategory(category)!;
      const label = this.getCategoryLabel(category);
      throw new Error(
        `Maximum of ${max} ${label} photo${max !== 1 ? 's' : ''} allowed for this order.`,
      );
    }

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

  async updatePhoto(
    orderNumber: string,
    photoId: string,
    updates: Partial<Pick<OrderPhoto, 'category' | 'caption'>>,
  ): Promise<void> {
    const orderPhotos = this.photos.get(orderNumber) || [];
    const photo = orderPhotos.find(p => p.id === photoId);

    if (photo) {
      if (updates.category) {
        updates.category = normalizeCategory(updates.category);
        if (
          updates.category !== photo.category &&
          !this.canAddPhotoToCategory(
            orderNumber,
            updates.category,
            photoId,
          )
        ) {
          const max = this.getMaxPhotosForCategory(updates.category)!;
          const label = this.getCategoryLabel(updates.category);
          throw new Error(
            `Maximum of ${max} ${label} photo${max !== 1 ? 's' : ''} allowed for this order.`,
          );
        }
      }
      Object.assign(photo, updates);
      await this.savePhotos();
      this.notifyListeners(orderNumber);
    }
  }

  async clearOrderPhotos(orderNumber: string): Promise<void> {
    this.photos.delete(orderNumber);
    await this.savePhotos();
    this.notifyListeners(orderNumber);
  }

  private notifyListeners(orderNumber: string) {
    const photos = this.getPhotosForOrder(orderNumber);
    const copy = [...photos];
    this.listenerEntries.forEach(entry => {
      if (entry.orderNumber === orderNumber) {
        entry.listener(copy);
      }
    });
  }

  onPhotosChange(
    orderNumber: string,
    listener: PhotoListener,
  ): () => void {
    const entry: ListenerEntry = {orderNumber, listener};
    this.listenerEntries.push(entry);
    listener([...this.getPhotosForOrder(orderNumber)]);

    return () => {
      this.listenerEntries = this.listenerEntries.filter(
        e => e.listener !== listener,
      );
    };
  }

  getCategoryLabel(category: PhotoCategory): string {
    return this.getCategoryDefinition(category).label;
  }
}

export const photoService = new PhotoService();
