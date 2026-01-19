import {OrderData, FlowStep, ContainerType, WasteStream, AddedContainer, MaterialsSupply, EquipmentPPE, ScannedDocument} from '../../types/wasteCollection';
import {ChecklistAnswer} from '../../types/checklist';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {SyncStatus} from '../../services/syncService';

export interface WasteCollectionSharedProps {
  // Order state
  selectedOrderData: OrderData | null;
  setSelectedOrderData: (order: OrderData | null) => void;
  dashboardSelectedOrder: OrderData | null;
  setDashboardSelectedOrder: (order: OrderData | null) => void;
  completedOrders: string[];
  setCompletedOrders: (orders: string[] | ((prev: string[]) => string[])) => void;
  orderStatuses: Record<string, OrderData['status']>;
  setOrderStatuses: (statuses: Record<string, OrderData['status']> | ((prev: Record<string, OrderData['status']>) => Record<string, OrderData['status']>)) => void;
  
  // Navigation
  currentStep: FlowStep;
  setCurrentStep: (step: FlowStep) => void;
  
  // Stream/Container state
  selectedStreamId: string;
  setSelectedStreamId: (id: string) => void;
  selectedStreamCode: string;
  setSelectedStreamCode: (code: string) => void;
  selectedContainerType: ContainerType | null;
  setSelectedContainerType: (type: ContainerType | null) => void;
  streamSearchQuery: string;
  setStreamSearchQuery: (query: string) => void;
  recentlyUsedProfiles: string[];
  setRecentlyUsedProfiles: (profiles: string[] | ((prev: string[]) => string[])) => void;
  
  // Container entry state
  tareWeight: string;
  setTareWeight: (weight: string) => void;
  scaleWeight: string;
  setScaleWeight: (weight: string) => void;
  grossWeight: string;
  setGrossWeight: (weight: string) => void;
  barcode: string;
  setBarcode: (barcode: string) => void;
  cylinderCount: string;
  setCylinderCount: (count: string) => void;
  isManualWeightEntry: boolean;
  setIsManualWeightEntry: (manual: boolean) => void;
  isScaleConnected: boolean;
  setIsScaleConnected: (connected: boolean) => void;
  scaleReading: number | null;
  setScaleReading: (reading: number | null) => void;
  
  // Containers
  addedContainers: AddedContainer[];
  setAddedContainers: (containers: AddedContainer[] | ((prev: AddedContainer[]) => AddedContainer[])) => void;
  
  // Programs
  selectedPrograms: Record<string, 'ship' | 'noship'>;
  setSelectedPrograms: (programs: Record<string, 'ship' | 'noship'> | ((prev: Record<string, 'ship' | 'noship'>) => Record<string, 'ship' | 'noship'>)) => void;
  
  // Manifest
  manifestTrackingNumber: string | null;
  setManifestTrackingNumber: (number: string | null) => void;
  manifestData: {
    trackingNumber?: string;
    createdAt?: Date;
    scannedImageUri?: string;
    signatureImageUri?: string;
  } | null;
  setManifestData: (data: {
    trackingNumber?: string;
    createdAt?: Date;
    scannedImageUri?: string;
    signatureImageUri?: string;
  } | null) => void;
  
  // Materials & Supplies
  materialsSupplies: MaterialsSupply[];
  setMaterialsSupplies: (materials: MaterialsSupply[] | ((prev: MaterialsSupply[]) => MaterialsSupply[])) => void;
  showAddMaterialModal: boolean;
  setShowAddMaterialModal: (show: boolean) => void;
  selectedMaterialItem: {itemNumber: string; description: string} | null;
  setSelectedMaterialItem: (item: {itemNumber: string; description: string} | null) => void;
  materialQuantity: string;
  setMaterialQuantity: (qty: string) => void;
  materialType: 'used' | 'left_behind';
  setMaterialType: (type: 'used' | 'left_behind') => void;
  showAddMaterialSuccess: boolean;
  setShowAddMaterialSuccess: (show: boolean) => void;
  handleAddMaterial: () => void;
  
  // Equipment & PPE
  equipmentPPE: EquipmentPPE[];
  setEquipmentPPE: (equipment: EquipmentPPE[] | ((prev: EquipmentPPE[]) => EquipmentPPE[])) => void;
  
  // Documents
  scannedDocuments: ScannedDocument[];
  setScannedDocuments: (docs: ScannedDocument[] | ((prev: ScannedDocument[]) => ScannedDocument[])) => void;
  showDocumentTypeSelector: boolean;
  setShowDocumentTypeSelector: (show: boolean) => void;
  pendingDocumentType: 'manifest' | 'ldr' | 'bol' | null;
  setPendingDocumentType: (type: 'manifest' | 'ldr' | 'bol' | null) => void;
  showScannedDocumentsViewer: boolean;
  setShowScannedDocumentsViewer: (show: boolean) => void;
  showCaptureMethodSelector: boolean;
  setShowCaptureMethodSelector: (show: boolean) => void;
  
  // Modals
  showPrintPreview: boolean;
  setShowPrintPreview: (show: boolean) => void;
  showPrintOptions: boolean;
  setShowPrintOptions: (show: boolean) => void;
  showSignatureModal: boolean;
  setShowSignatureModal: (show: boolean) => void;
  showChecklistModal: boolean;
  setShowChecklistModal: (show: boolean) => void;
  showDropWasteModal: boolean;
  setShowDropWasteModal: (show: boolean) => void;
  showLabelPrinting: boolean;
  setShowLabelPrinting: (show: boolean) => void;
  printingLabelBarcode: string;
  setPrintingLabelBarcode: (barcode: string) => void;
  
  // Other
  checklistAnswers: ChecklistAnswer[] | null;
  setChecklistAnswers: (answers: ChecklistAnswer[] | null) => void;
  useMasterDetail: boolean;
  setUseMasterDetail: (use: boolean) => void;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;
  truckId: string;
  setTruckId: (id: string) => void;
  activeTimeTracking: TimeTrackingRecord | null;
  setActiveTimeTracking: (tracking: TimeTrackingRecord | null) => void;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  setCurrentOrderTimeTracking: (tracking: TimeTrackingRecord | null) => void;
  elapsedTimeDisplay: string;
  setElapsedTimeDisplay: (display: string) => void;
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  
  // Data
  orders: OrderData[];
  wasteStreams: WasteStream[];
  allContainerTypes: ContainerType[];
  
  // Utility functions
  isOrderCompleted: (orderNumber: string) => boolean;
  generateManifestTrackingNumber: () => string;
  
  // Refs
  signatureRef: React.RefObject<any>;
}
