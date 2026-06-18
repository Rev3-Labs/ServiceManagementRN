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

export interface PhotoDocumentGroup {
  id: string;
  orderNumber: string;
  category: PhotoCategory;
  label?: string;
  createdAt: number;
}

export interface OrderPhoto {
  id: string;
  uri: string;
  orderNumber: string;
  category: PhotoCategory;
  /** Links multi-page shipping document photos together. */
  groupId?: string;
  /** 1-based page order within a document group. */
  pageIndex?: number;
  caption?: string;
  timestamp: string;
  capturedAt: number;
}

export interface PhotoDocumentGroupWithPhotos extends PhotoDocumentGroup {
  photos: OrderPhoto[];
}

type StoredOrderEntry =
  | OrderPhoto[]
  | {photos: OrderPhoto[]; groups?: PhotoDocumentGroup[]};

export type PhotoListener = (photos: OrderPhoto[]) => void;

type ListenerEntry = {orderNumber: string; listener: PhotoListener};

export const isShippingDocumentCategory = (
  category: PhotoCategory,
): boolean => {
  const definition = PHOTO_CATEGORY_DEFINITIONS.find(
    d => d.category === category,
  );
  return definition?.group === 'shipping-documents';
};

class PhotoService {
  private photos: Map<string, OrderPhoto[]> = new Map();
  private documentGroups: Map<string, PhotoDocumentGroup[]> = new Map();
  private listenerEntries: ListenerEntry[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    await this.loadPhotos();
  }

  private normalizePhoto(photo: OrderPhoto): OrderPhoto {
    return {
      ...photo,
      category: normalizeCategory(photo.category),
    };
  }

  private migrateShippingPhotos(orderNumber: string) {
    const orderPhotos = this.photos.get(orderNumber) ?? [];
    const groups = this.documentGroups.get(orderNumber) ?? [];
    const groupsById = new Map(groups.map(g => [g.id, g]));

    let changed = false;

    const shippingPhotos = orderPhotos.filter(p =>
      isShippingDocumentCategory(p.category),
    );

    for (const photo of shippingPhotos) {
      if (photo.groupId && photo.pageIndex != null) continue;

      let groupId = photo.groupId;
      if (!groupId) {
        const existingLegacy = groups.find(
          g =>
            g.category === photo.category &&
            g.id.startsWith(`legacy-${photo.category}-`),
        );
        if (existingLegacy) {
          groupId = existingLegacy.id;
        } else {
          groupId = `legacy-${photo.category}-${orderNumber}`;
          const label = this.getCategoryLabel(photo.category);
          const group: PhotoDocumentGroup = {
            id: groupId,
            orderNumber,
            category: photo.category,
            label,
            createdAt: photo.capturedAt,
          };
          groups.push(group);
          groupsById.set(groupId, group);
          changed = true;
        }
      }

      if (!photo.groupId) {
        photo.groupId = groupId;
        changed = true;
      }
    }

    for (const group of groups) {
      if (!isShippingDocumentCategory(group.category)) continue;
      const pages = orderPhotos
        .filter(p => p.groupId === group.id)
        .sort((a, b) => a.capturedAt - b.capturedAt);
      pages.forEach((photo, index) => {
        const nextIndex = index + 1;
        if (photo.pageIndex !== nextIndex) {
          photo.pageIndex = nextIndex;
          changed = true;
        }
      });
    }

    if (changed) {
      this.photos.set(orderNumber, orderPhotos);
      this.documentGroups.set(orderNumber, groups);
      void this.savePhotos();
    }
  }

  private async loadPhotos() {
    try {
      const stored = await safeAsyncStorage.getItem(PHOTOS_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, StoredOrderEntry>;
      Object.entries(parsed).forEach(([orderNumber, entry]) => {
        if (Array.isArray(entry)) {
          this.photos.set(
            orderNumber,
            entry.map(photo => this.normalizePhoto(photo)),
          );
          this.documentGroups.set(orderNumber, []);
        } else {
          this.photos.set(
            orderNumber,
            (entry.photos ?? []).map(photo => this.normalizePhoto(photo)),
          );
          this.documentGroups.set(orderNumber, entry.groups ?? []);
        }
        this.migrateShippingPhotos(orderNumber);
      });
    } catch (error) {
      console.error('[PhotoService] Error loading photos:', error);
    }
  }

  private async savePhotos() {
    try {
      const stored: Record<
        string,
        {photos: OrderPhoto[]; groups: PhotoDocumentGroup[]}
      > = {};
      const orderNumbers = new Set([
        ...this.photos.keys(),
        ...this.documentGroups.keys(),
      ]);
      orderNumbers.forEach(orderNumber => {
        stored[orderNumber] = {
          photos: this.photos.get(orderNumber) ?? [],
          groups: this.documentGroups.get(orderNumber) ?? [],
        };
      });
      await safeAsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(stored));
    } catch (error) {
      console.error('[PhotoService] Error saving photos:', error);
    }
  }

  private removeEmptyGroups(orderNumber: string) {
    const orderPhotos = this.photos.get(orderNumber) ?? [];
    const groups = this.documentGroups.get(orderNumber) ?? [];
    const nonEmpty = groups.filter(group =>
      orderPhotos.some(photo => photo.groupId === group.id),
    );
    if (nonEmpty.length !== groups.length) {
      this.documentGroups.set(orderNumber, nonEmpty);
    }
  }

  private getNextPageIndex(orderNumber: string, groupId: string): number {
    const pages = this.getPhotosInGroup(orderNumber, groupId);
    if (pages.length === 0) return 1;
    return Math.max(...pages.map(p => p.pageIndex ?? 0)) + 1;
  }

  private reindexGroupPages(orderNumber: string, groupId: string) {
    const orderPhotos = this.photos.get(orderNumber) ?? [];
    const pages = orderPhotos
      .filter(p => p.groupId === groupId)
      .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0));
    pages.forEach((photo, index) => {
      photo.pageIndex = index + 1;
    });
  }

  getPhotosForOrder(orderNumber: string): OrderPhoto[] {
    return this.photos.get(orderNumber) || [];
  }

  getDocumentGroupsForOrder(
    orderNumber: string,
    category?: PhotoCategory,
  ): PhotoDocumentGroup[] {
    const groups = this.documentGroups.get(orderNumber) ?? [];
    const filtered = category
      ? groups.filter(g => g.category === category)
      : groups;
    return [...filtered].sort((a, b) => a.createdAt - b.createdAt);
  }

  getDocumentGroupWithPhotos(
    orderNumber: string,
    groupId: string,
  ): PhotoDocumentGroupWithPhotos | null {
    const group = (this.documentGroups.get(orderNumber) ?? []).find(
      g => g.id === groupId,
    );
    if (!group) return null;
    const photos = this.getPhotosInGroup(orderNumber, groupId);
    return {...group, photos};
  }

  getPhotosInGroup(orderNumber: string, groupId: string): OrderPhoto[] {
    return this.getPhotosForOrder(orderNumber)
      .filter(p => p.groupId === groupId)
      .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0));
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
    if (isShippingDocumentCategory(category)) {
      return this.hasDocumentForCategory(orderNumber, category);
    }
    return this.getPhotoCountForCategory(orderNumber, category) > 0;
  }

  hasDocumentForCategory(
    orderNumber: string,
    category: PhotoCategory,
  ): boolean {
    return this.getDocumentGroupsForOrder(orderNumber, category).some(
      group => this.getPhotosInGroup(orderNumber, group.id).length > 0,
    );
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
      category => !this.hasDocumentForCategory(orderNumber, category),
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

  async createDocumentGroup(
    orderNumber: string,
    category: PhotoCategory,
    label?: string,
  ): Promise<PhotoDocumentGroup> {
    if (!isShippingDocumentCategory(category)) {
      throw new Error(
        `Document groups are only supported for shipping documents.`,
      );
    }

    const group: PhotoDocumentGroup = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderNumber,
      category,
      label: label ?? this.getCategoryLabel(category),
      createdAt: Date.now(),
    };

    const groups = this.documentGroups.get(orderNumber) ?? [];
    groups.push(group);
    this.documentGroups.set(orderNumber, groups);
    await this.savePhotos();
    return group;
  }

  async addPhotoToGroup(
    orderNumber: string,
    groupId: string,
    uri: string,
    caption?: string,
  ): Promise<OrderPhoto> {
    const group = (this.documentGroups.get(orderNumber) ?? []).find(
      g => g.id === groupId,
    );
    if (!group) {
      throw new Error('Document group not found.');
    }

    if (!this.canAddPhotoToCategory(orderNumber, group.category)) {
      const max = this.getMaxPhotosForCategory(group.category)!;
      const label = this.getCategoryLabel(group.category);
      throw new Error(
        `Maximum of ${max} ${label} photo${max !== 1 ? 's' : ''} allowed for this order.`,
      );
    }

    const photo: OrderPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uri,
      orderNumber,
      category: group.category,
      groupId,
      pageIndex: this.getNextPageIndex(orderNumber, groupId),
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

  async addPhoto(
    orderNumber: string,
    uri: string,
    category: PhotoCategory,
    caption?: string,
    groupId?: string,
  ): Promise<OrderPhoto> {
    if (isShippingDocumentCategory(category)) {
      if (groupId) {
        return this.addPhotoToGroup(orderNumber, groupId, uri, caption);
      }
      const group = await this.createDocumentGroup(orderNumber, category);
      return this.addPhotoToGroup(orderNumber, group.id, uri, caption);
    }

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
    const photo = orderPhotos.find(p => p.id === photoId);
    const filtered = orderPhotos.filter(p => p.id !== photoId);

    if (filtered.length === 0) {
      this.photos.delete(orderNumber);
    } else {
      this.photos.set(orderNumber, filtered);
    }

    if (photo?.groupId) {
      this.reindexGroupPages(orderNumber, photo.groupId);
      this.removeEmptyGroups(orderNumber);
    }

    await this.savePhotos();
    this.notifyListeners(orderNumber);
  }

  async deleteDocumentGroup(
    orderNumber: string,
    groupId: string,
  ): Promise<void> {
    const orderPhotos = this.photos.get(orderNumber) || [];
    const filtered = orderPhotos.filter(p => p.groupId !== groupId);
    this.photos.set(orderNumber, filtered.length > 0 ? filtered : []);
    if (filtered.length === 0) {
      this.photos.delete(orderNumber);
    }

    const groups = (this.documentGroups.get(orderNumber) ?? []).filter(
      g => g.id !== groupId,
    );
    if (groups.length === 0) {
      this.documentGroups.delete(orderNumber);
    } else {
      this.documentGroups.set(orderNumber, groups);
    }

    await this.savePhotos();
    this.notifyListeners(orderNumber);
  }

  async updateDocumentGroup(
    orderNumber: string,
    groupId: string,
    updates: Partial<Pick<PhotoDocumentGroup, 'label'>>,
  ): Promise<void> {
    const groups = this.documentGroups.get(orderNumber) ?? [];
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Document group not found.');
    }

    if (updates.label !== undefined) {
      const trimmed = updates.label.trim();
      group.label = trimmed || this.getCategoryLabel(group.category);
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
    this.documentGroups.delete(orderNumber);
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

  getDocumentGroupDisplayLabel(
    orderNumber: string,
    groupId: string,
  ): string {
    const group = (this.documentGroups.get(orderNumber) ?? []).find(
      g => g.id === groupId,
    );
    if (!group) return 'Document';
    const base = group.label ?? this.getCategoryLabel(group.category);
    const sameCategoryGroups = this.getDocumentGroupsForOrder(
      orderNumber,
      group.category,
    );
    if (sameCategoryGroups.length <= 1) {
      return base;
    }
    const duplicateLabels = sameCategoryGroups.filter(
      g =>
        (g.label ?? this.getCategoryLabel(g.category)) === base,
    );
    if (duplicateLabels.length <= 1) {
      return base;
    }
    const index = sameCategoryGroups.findIndex(g => g.id === groupId) + 1;
    return `${base} #${index}`;
  }
}

export const photoService = new PhotoService();
