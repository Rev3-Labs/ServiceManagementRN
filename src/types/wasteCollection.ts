export type FlowStep =
  | 'dashboard'
  | 'order-detail'
  | 'stream-selection'
  | 'container-selection'
  | 'container-entry'
  | 'container-summary'
  | 'containers-review'   // Order-level: all containers by service type, add/delete before manifest
  | 'manifest-management'
  | 'materials-supplies'
  | 'equipment-ppe'
  | 'order-service';

export interface OrderData {
  orderNumber: string;
  customer: string;
  site: string;
  city: string;
  state: string;
  zip?: string; // 5 or 9 digit ZIP code
  genNumber?: string;
  orderType?: string;
  programs: string[];
  serviceOrderNumbers?: Record<string, string>; // Maps program ID to service order number (e.g., "SR12345678")
  serviceDate: string;
  requiredDate?: string; // MM/DD/YYYY format
  generatorStatus?: 'LQG' | 'SQG' | 'CESQG' | 'VSQG'; // Large Quantity Generator, Small Quantity Generator, etc.
  epaId?: boolean; // Whether EPA ID is present
  status: 'Scheduled' | 'Partial' | 'In Progress' | 'Blocked' | 'Completed';
  primaryContactName?: string;
  primaryContactPhone?: string; // Format: 10 digits or with formatting
  primaryContactEmail?: string;
  hasSecondaryContacts?: boolean; // Whether there are additional contacts available
  customerSpecialInstructions?: string;
  siteAccessNotes?: string;
  safetyWarnings?: string[];
  previousServiceNotes?: Array<{
    date: string;
    note: string;
    technician?: string;
  }>;
}

export interface WasteStream {
  id: string;
  profileName: string;
  profileNumber: string;
  category: string;
  hazardClass?: string;
  consolidationAllowed: boolean;
  accumulationsApply: boolean;
  specialInstructions?: string;
  flags?: string[];
  containerCount?: number;
  allowedContainers: string[];
  isDEARegulated?: boolean;
  requiresCylinderCount?: boolean; // Whether this profile requires cylinder count entry
  wasteCodes?: string[]; // Waste codes including P-Listed codes (P001-P205)
}

export interface ContainerType {
  id: string;
  size: string;
  capacity: string;
  code: string;
  weight: string;
  popular: boolean;
}

export interface AddedContainer {
  id: string;
  streamName: string;
  streamCode: string;
  containerType: string;
  containerSize: string;
  barcode: string;
  tareWeight: string;
  grossWeight: string;
  netWeight: number;
  isManualEntry?: boolean;
  shippingLabelBarcode?: string;
}

export interface MaterialsSupply {
  id: string;
  itemNumber: string;
  description: string;
  quantity: number;
  type: 'used' | 'left_behind';
}

export interface EquipmentPPE {
  id: string;
  name: string;
  count: number;
}

export interface ScannedDocument {
  id: string;
  orderNumber: string;
  documentType: 'manifest' | 'ldr' | 'bol';
  imageUri: string;
  scannedAt: string;
  captureMethod?: 'Camera' | 'Gallery';
}

export type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

export interface WasteCollectionScreenProps {
  username?: string;
  onLogout?: () => void;
  onNavigate?: (screen: Screen) => void;
  onGoBack?: () => void;
}

export interface ValidationIssue {
  id: string;
  message: string;
  severity: 'error' | 'warning';
  screen: FlowStep;
  description?: string;
}
