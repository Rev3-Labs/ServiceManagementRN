import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import {Button} from '../../components/Button';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {OrderData, FlowStep, AddedContainer} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {styles} from './styles';

/** Static demo values shared across the shipment documents. */
const GENERATOR = {
  name: 'Soleo Health',
  attn: 'Attn: William Quila',
  address: '1324 W Winton Ave',
  cityStateZip: 'Hayward, CA 94545-1408',
  phone: '(510) 362-7360',
  epaId: 'CAL000483809',
};
const FACILITY = {
  name: 'Clean Earth of Alabama, Inc.',
  address: '402 Webster Chapel Road',
  cityStateZip: 'Glencoe, AL 35905',
  phone: '(800) 739-9156',
  epaId: 'ALD981020894',
};
const TRANSPORTER = {
  name: 'Clean Earth Specialty Waste Solutions, Inc.',
  epaId: 'MNS000110924',
};
const EMERGENCY_PHONE = '(877) 577-2669';

export interface ManifestManagementScreenProps {
  // PersistentOrderHeader props
  selectedOrderData: OrderData | null;
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  setCurrentStep: (step: FlowStep) => void;
  elapsedTimeDisplay: string;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  handleRequestPause: () => void;
  handleResumeTracking: () => void;
  setShowJobNotesModal: (show: boolean) => void;
  validationState: {state: 'none' | 'warning' | 'error'; count: number};
  setShowValidationModal: (show: boolean) => void;
  setShowServiceCenterModal: (show: boolean) => void;
  selectedTruck: {number: string; description?: string} | null;
  truckId: string;
  selectedTrailer: {number: string; description?: string} | null;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  handleManualSync: () => void;
  serviceTypeBadgesForHeader: Array<{
    serviceTypeId: string;
    srNumber?: string;
    status: 'pending' | 'in-progress' | 'noship' | 'completed';
  }>;
  isOrderCompleted: (orderNumber: string) => boolean;

  // Document & print actions
  addedContainers: AddedContainer[];
  manifestTrackingNumber: string | null;
  printManifest: () => Promise<void>;
  printBOL: () => Promise<void>;
  printLDR: () => Promise<void>;
  printAllDocuments: () => Promise<void>;
  /** True once "Print All" has been used for this order; hides that option. */
  hasPrintedAllDocuments: boolean;
  /** True when the order has No-Ship service types; routes Continue to the No-Ship preview. */
  hasNoShipItems: boolean;
  setSelectedOrderData: (order: OrderData | null) => void;
}

/** A previewed shipment document rendered on its own titled sheet. */
const DocumentCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({title, subtitle, children}) => (
  <View style={docStyles.card}>
    <View style={docStyles.cardHeaderText}>
      <Text style={docStyles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={docStyles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
    {children}
  </View>
);

export interface PrintMenuOption {
  label: string;
  icon: string;
  onPress: () => void;
}

/**
 * Footer split button: a primary action plus a caret that opens a menu of
 * additional print options. When `onPrimary` is omitted, pressing the primary
 * area opens the menu instead.
 */
const PrintSplitButton: React.FC<{
  primaryLabel: string;
  onPrimary?: () => void;
  options: PrintMenuOption[];
  disabled?: boolean;
  style?: object;
}> = ({primaryLabel, onPrimary, options, disabled, style}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View style={[splitStyles.wrap, disabled && splitStyles.wrapDisabled, style]}>
      <TouchableOpacity
        style={splitStyles.primary}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => (onPrimary ? onPrimary() : setMenuOpen(true))}>
        <Icon name="print" size={20} color={colors.primaryForeground} />
        <Text style={splitStyles.primaryText} numberOfLines={1}>
          {primaryLabel}
        </Text>
      </TouchableOpacity>
      <View style={splitStyles.divider} />
      <TouchableOpacity
        style={splitStyles.caret}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="More print options">
        <Icon name="arrow-drop-up" size={26} color={colors.primaryForeground} />
      </TouchableOpacity>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity
          style={splitStyles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}>
          <View style={splitStyles.menu}>
            <Text style={splitStyles.menuTitle}>Print Options</Text>
            {options.map(option => (
              <TouchableOpacity
                key={option.label}
                style={splitStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuOpen(false);
                  option.onPress();
                }}>
                <Icon name={option.icon} size={22} color={colors.foreground} />
                <Text style={splitStyles.menuItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const ManifestManagementScreen: React.FC<ManifestManagementScreenProps> = ({
  selectedOrderData,
  isOrderHeaderCollapsed,
  setIsOrderHeaderCollapsed,
  setCurrentStep,
  elapsedTimeDisplay,
  currentOrderTimeTracking,
  handleRequestPause,
  handleResumeTracking,
  setShowJobNotesModal,
  validationState,
  setShowValidationModal,
  setShowServiceCenterModal,
  selectedTruck,
  truckId,
  selectedTrailer,
  syncStatus,
  pendingSyncCount,
  handleManualSync,
  serviceTypeBadgesForHeader,
  isOrderCompleted,
  addedContainers,
  manifestTrackingNumber,
  printManifest,
  printBOL,
  printLDR,
  printAllDocuments,
  hasPrintedAllDocuments,
  hasNoShipItems,
  setSelectedOrderData,
}) => {
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  /** Containers ordered by the order's program sequence with any unassigned at the end. */
  const manifestContainers = useMemo(() => {
    if (!selectedOrderData) return [] as AddedContainer[];
    const ordered: AddedContainer[] = [];
    selectedOrderData.programs.forEach(stId => {
      ordered.push(...addedContainers.filter(c => c.serviceTypeId === stId));
    });
    const unassigned = addedContainers.filter(
      c =>
        !c.serviceTypeId ||
        !selectedOrderData.programs.includes(c.serviceTypeId),
    );
    return [...ordered, ...unassigned];
  }, [selectedOrderData, addedContainers]);

  const totalNetWeight = useMemo(
    () => manifestContainers.reduce((sum, c) => sum + (c.netWeight || 0), 0),
    [manifestContainers],
  );

  /** Unique waste codes across all containers, for the LDR notification. */
  const uniqueWasteCodes = useMemo(() => {
    const set = new Set<string>();
    manifestContainers.forEach(c =>
      (c.wasteCodes || []).forEach(code => set.add(code)),
    );
    return Array.from(set);
  }, [manifestContainers]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now
      .getDate()
      .toString()
      .padStart(2, '0')}/${now.getFullYear()}`;
  }, []);

  const shipmentDocNumber = manifestTrackingNumber || '201286074XXX';

  // Completed orders cannot open or view manifest — redirect to dashboard
  useEffect(() => {
    if (selectedOrderData && isOrderCompleted(selectedOrderData.orderNumber)) {
      setSelectedOrderData(null);
      setCurrentStep('dashboard');
    }
  }, [selectedOrderData, isOrderCompleted]);

  if (!selectedOrderData) return null;

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() => setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)}
        onBackPress={() => setCurrentStep('containers-review')}
        subtitle="Print Preview"
        elapsedTimeDisplay={elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData ? elapsedTimeDisplay : undefined}
        isPaused={Boolean(currentOrderTimeTracking?.pausedAt)}
        onPause={handleRequestPause}
        onResume={handleResumeTracking}
        onViewNotes={() => {
          setShowJobNotesModal(true);
        }}
        validationState={validationState}
        onViewValidation={() => setShowValidationModal(true)}
        onViewServiceCenter={() => setShowServiceCenterModal(true)}
        truckNumber={selectedTruck?.number || truckId || undefined}
        trailerNumber={selectedTrailer?.number || null}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        onSync={handleManualSync}
        serviceTypeBadges={serviceTypeBadgesForHeader}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {hasPrintedAllDocuments ? (
          <View style={docStyles.printedAllNotice}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <Text style={docStyles.printedAllNoticeText}>
              All documents printed for this order. Use the print menu below to
              reprint an individual document if needed.
            </Text>
          </View>
        ) : null}

        {/* Manifest document */}
        <DocumentCard
          title="Uniform Hazardous Waste Manifest"
          subtitle="EPA Form 8700-22">
          {renderManifestDocument()}
        </DocumentCard>

        {/* Bill of Lading */}
        <DocumentCard
          title="Bill of Lading (BOL)"
          subtitle="Straight Bill of Lading — Non-Negotiable">
          {renderBOLDocument(
            manifestContainers,
            totalNetWeight,
            shipmentDocNumber,
            todayStr,
          )}
        </DocumentCard>

        {/* Land Disposal Restrictions */}
        <DocumentCard
          title="Land Disposal Restrictions (LDR)"
          subtitle="40 CFR 268 Notification / Certification">
          {renderLDRDocument(uniqueWasteCodes, shipmentDocNumber, todayStr)}
        </DocumentCard>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          onPress={() => setCurrentStep('containers-review')}
        />
        <PrintSplitButton
          style={docStyles.footerPrintButton}
          disabled={isCurrentOrderCompleted}
          primaryLabel={hasPrintedAllDocuments ? 'Print' : 'Print All'}
          onPrimary={hasPrintedAllDocuments ? undefined : printAllDocuments}
          options={[
            ...(hasPrintedAllDocuments
              ? []
              : [
                  {
                    label: 'Print All Documents',
                    icon: 'print',
                    onPress: printAllDocuments,
                  },
                ]),
            {label: 'Print Manifest', icon: 'description', onPress: printManifest},
            {label: 'Print BOL', icon: 'local-shipping', onPress: printBOL},
            {label: 'Print LDR', icon: 'article', onPress: printLDR},
          ]}
        />
        <Button
          title="Continue"
          variant="primary"
          size="md"
          disabled={isCurrentOrderCompleted}
          onPress={() => {
            if (!isCurrentOrderCompleted) {
              setCurrentStep(hasNoShipItems ? 'noship-preview' : 'order-service');
            }
          }}
        />
      </View>
    </View>
  );
};

/** EPA Uniform Hazardous Waste Manifest (Form 8700-22) preview. */
function renderManifestDocument() {
  return (
    <View style={styles.epaFormContainer}>
      {/* Form Header */}
      <View style={styles.epaFormHeader}>
        <View style={styles.epaFormHeaderLeft}>
          <Text style={styles.epaFormSmallText}>Please print or type.</Text>
          <View style={styles.epaFormTitleBox}>
            <Text style={styles.epaFormTitle}>UNIFORM HAZARDOUS</Text>
            <Text style={styles.epaFormTitle}>WASTE MANIFEST</Text>
          </View>
        </View>
        <View style={styles.epaFormHeaderCenter}>
          <View style={styles.epaFormBarcodeBox}>
            <Text style={styles.epaFormBarcodeText}>201286074XXX</Text>
            <Text style={styles.epaFormManifestNum}>43343836</Text>
          </View>
          <Text style={styles.epaFormProviderText}>ERI Provider: Clean Earth</Text>
        </View>
        <View style={styles.epaFormHeaderRight}>
          <View style={styles.epaFormPageBox}>
            <Text style={styles.epaFormPageNum}>1</Text>
          </View>
          <Text style={styles.epaFormSmallText}>Form Approved, OMB No. 2050-0039</Text>
        </View>
      </View>

      {/* Section 1-4: Generator ID, Page, Emergency Phone, Manifest Tracking */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>1. Generator ID Number</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.epaId}</Text>
        </View>
        <View style={[styles.epaFormCell, {width: 60}]}>
          <Text style={styles.epaFormCellLabel}>2. Page 1 of</Text>
          <Text style={styles.epaFormCellValue}>1</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>3. Emergency Response Phone</Text>
          <Text style={styles.epaFormCellValue}>{EMERGENCY_PHONE}</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1.5}]}>
          <Text style={styles.epaFormCellLabel}>4. Manifest Tracking Number</Text>
          <Text style={styles.epaFormCellValueLarge}>201286074XXX</Text>
        </View>
      </View>

      {/* Section 5: Generator Info */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>5. Generator's Name and Mailing Address</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.attn}</Text>
          <Text style={styles.epaFormCellValueBold}>{GENERATOR.name}</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.address}</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.cityStateZip} Ph: {GENERATOR.phone}</Text>
          <Text style={styles.epaFormCellLabelSmall}>Generator's Phone:</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>Generator's Site Address (if different than mailing address)</Text>
          <Text style={styles.epaFormCellValueBold}>{GENERATOR.name}</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.address}</Text>
          <Text style={styles.epaFormCellValue}>{GENERATOR.cityStateZip} Ph: {GENERATOR.phone}</Text>
        </View>
      </View>

      {/* Section 6: Transporter 1 */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 2}]}>
          <Text style={styles.epaFormCellLabel}>6. Transporter 1 Company Name</Text>
          <Text style={styles.epaFormCellValueBold}>{TRANSPORTER.name}</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
          <Text style={styles.epaFormCellValue}>{TRANSPORTER.epaId}</Text>
        </View>
      </View>

      {/* Section 7: Transporter 2 */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 2}]}>
          <Text style={styles.epaFormCellLabel}>7. Transporter 2 Company Name</Text>
          <Text style={styles.epaFormCellValue} />
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
          <Text style={styles.epaFormCellValue} />
        </View>
      </View>

      {/* Section 8: Designated Facility */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 2}]}>
          <Text style={styles.epaFormCellLabel}>8. Designated Facility Name and Site Address</Text>
          <Text style={styles.epaFormCellValueBold}>{FACILITY.name}</Text>
          <Text style={styles.epaFormCellValue}>{FACILITY.address}</Text>
          <Text style={styles.epaFormCellValue}>{FACILITY.cityStateZip}</Text>
          <Text style={styles.epaFormCellLabelSmall}>Facility's Phone: {FACILITY.phone}</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
          <Text style={styles.epaFormCellValueBold}>{FACILITY.epaId}</Text>
        </View>
      </View>

      {/* Section 9: Waste Description Table Header */}
      <View style={styles.epaFormSectionHeader}>
        <Text style={styles.epaFormSectionHeaderText}>GENERATOR</Text>
      </View>
      <View style={styles.epaWasteTableHeader}>
        <View style={[styles.epaWasteTableCell, {width: 30}]}>
          <Text style={styles.epaFormCellLabelSmall}>9a.</Text>
          <Text style={styles.epaFormCellLabelSmall}>HM</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {flex: 3}]}>
          <Text style={styles.epaFormCellLabelSmall}>9b. U.S. DOT Description (including Proper Shipping Name, Hazard Class, ID Number,</Text>
          <Text style={styles.epaFormCellLabelSmall}>and Packing Group (if any))</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 80}]}>
          <Text style={styles.epaFormCellLabelSmall}>10. Containers</Text>
          <View style={{flexDirection: 'row'}}>
            <Text style={[styles.epaFormCellLabelSmall, {flex: 1}]}>No.</Text>
            <Text style={[styles.epaFormCellLabelSmall, {flex: 1}]}>Type</Text>
          </View>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 60}]}>
          <Text style={styles.epaFormCellLabelSmall}>11. Total</Text>
          <Text style={styles.epaFormCellLabelSmall}>Quantity</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 40}]}>
          <Text style={styles.epaFormCellLabelSmall}>12. Unit</Text>
          <Text style={styles.epaFormCellLabelSmall}>Wt/Vol</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 100}]}>
          <Text style={styles.epaFormCellLabelSmall}>13. Waste Codes</Text>
        </View>
      </View>

      {/* Waste Row 1 */}
      <View style={styles.epaWasteTableRow}>
        <View style={[styles.epaWasteTableCell, {width: 30, justifyContent: 'center'}]}>
          <Text style={styles.epaFormCellValueBold}>X</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {flex: 3}]}>
          <Text style={styles.epaFormCellLabelSmall}>1</Text>
          <Text style={styles.epaFormCellValue}>UN1950, Waste Aerosols, flammable 2.1</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 80}]}>
          <View style={{flexDirection: 'row'}}>
            <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>1</Text>
            <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>CF</Text>
          </View>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 60}]}>
          <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>00001</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 40}]}>
          <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>P</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 100}]}>
          <Text style={styles.epaFormCellValue}>311</Text>
          <Text style={styles.epaFormCellValue}>D001</Text>
        </View>
      </View>

      {/* Waste Row 2 */}
      <View style={styles.epaWasteTableRow}>
        <View style={[styles.epaWasteTableCell, {width: 30, justifyContent: 'center'}]}>
          <Text style={styles.epaFormCellValueBold}>X</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {flex: 3}]}>
          <Text style={styles.epaFormCellLabelSmall}>2</Text>
          <Text style={styles.epaFormCellValue}>UN2924, Waste Flammable liquids, corrosive, n.o.s. (ISOPROPYL ALCOHOL, AMMONIA), 3 (8), PG II</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 80}]}>
          <View style={{flexDirection: 'row'}}>
            <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>1</Text>
            <Text style={[styles.epaFormCellValue, {flex: 1, textAlign: 'center'}]}>CF</Text>
          </View>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 60}]}>
          <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>00002</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 40}]}>
          <Text style={[styles.epaFormCellValue, {textAlign: 'center'}]}>P</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 100}]}>
          <Text style={styles.epaFormCellValue}>311</Text>
          <Text style={styles.epaFormCellValue}>D001</Text>
          <Text style={styles.epaFormCellValue}>D002</Text>
        </View>
      </View>

      {/* Empty Waste Rows */}
      <View style={styles.epaWasteTableRow}>
        <View style={[styles.epaWasteTableCell, {width: 30}]} />
        <View style={[styles.epaWasteTableCell, {flex: 3}]}>
          <Text style={styles.epaFormCellLabelSmall}>3</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 80}]} />
        <View style={[styles.epaWasteTableCell, {width: 60}]} />
        <View style={[styles.epaWasteTableCell, {width: 40}]} />
        <View style={[styles.epaWasteTableCell, {width: 100}]} />
      </View>

      <View style={styles.epaWasteTableRow}>
        <View style={[styles.epaWasteTableCell, {width: 30}]} />
        <View style={[styles.epaWasteTableCell, {flex: 3}]}>
          <Text style={styles.epaFormCellLabelSmall}>4</Text>
        </View>
        <View style={[styles.epaWasteTableCell, {width: 80}]} />
        <View style={[styles.epaWasteTableCell, {width: 60}]} />
        <View style={[styles.epaWasteTableCell, {width: 40}]} />
        <View style={[styles.epaWasteTableCell, {width: 100}]} />
      </View>

      {/* Section 14: Special Handling */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>14. Special Handling Instructions and Additional Information</Text>
          <Text style={styles.epaFormCellValue}>1.ERG#126: 114898SPW PHARMACEUTICAL AEROSOLS( INHALERS) LTD QTY</Text>
          <Text style={styles.epaFormCellValue}>2.ERG#132: 114888SP(FLAMMABLE/CORROSIVE PHARMACEUTICALS (AMMONIA INHAL) LTD QTY</Text>
        </View>
      </View>

      {/* Section 15: Generator Certification */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>15. GENERATOR'S/OFFEROR'S CERTIFICATION:</Text>
          <Text style={styles.epaFormCellValueSmall}>
            I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labeled/placarded, and are in all respects in proper condition for transport according to applicable international and national governmental regulations. If export shipment and I am the Primary Exporter, I certify that the contents of this consignment conform to the terms of the attached EPA Acknowledgment of Consent.
          </Text>
          <Text style={styles.epaFormCellValueSmall}>
            I certify that the waste minimization statement identified in 40 CFR 262.27(a) (if I am a large quantity generator) or (b) (if I am a small quantity generator) is true.
          </Text>
          <View style={styles.epaSignatureRow}>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Generator's/Offeror's Printed/Typed Name</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={styles.epaDateBox}>
              <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
              <View style={styles.epaDateRow}>
                <Text style={styles.epaDateValue}>11</Text>
                <Text style={styles.epaDateValue}>14</Text>
                <Text style={styles.epaDateValue}>2025</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Transporter Section */}
      <View style={styles.epaFormSectionHeader}>
        <Text style={styles.epaFormSectionHeaderText}>TRANSPORTER</Text>
      </View>

      {/* Section 16: International Shipments */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>16. International Shipments</Text>
          <View style={{flexDirection: 'row', gap: 16, alignItems: 'center'}}>
            <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
            <Text style={styles.epaFormCellValue}>Import to U.S.</Text>
            <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
            <Text style={styles.epaFormCellValue}>Export from U.S.</Text>
          </View>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabelSmall}>Port of entry/exit:</Text>
          <Text style={styles.epaFormCellLabelSmall}>Date leaving U.S.:</Text>
        </View>
      </View>

      {/* Section 17: Transporter Acknowledgment */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>17. Transporter Acknowledgment of Receipt of Materials</Text>
          <View style={styles.epaSignatureRow}>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Transporter 1 Printed/Typed Name</Text>
              <Text style={styles.epaFormCellValueBold}>Aaron Cayson</Text>
            </View>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={styles.epaDateBox}>
              <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
              <View style={styles.epaDateRow}>
                <Text style={styles.epaDateValue}>11</Text>
                <Text style={styles.epaDateValue}>14</Text>
                <Text style={styles.epaDateValue}>2025</Text>
              </View>
            </View>
          </View>
          <View style={[styles.epaSignatureRow, {marginTop: 8}]}>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Transporter 2 Printed/Typed Name</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={styles.epaDateBox}>
              <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
              <View style={styles.epaDateRow}>
                <Text style={styles.epaDateValue} />
                <Text style={styles.epaDateValue} />
                <Text style={styles.epaDateValue} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Designated Facility Section */}
      <View style={styles.epaFormSectionHeader}>
        <Text style={styles.epaFormSectionHeaderText}>DESIGNATED FACILITY</Text>
      </View>

      {/* Section 18: Discrepancy */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>18. Discrepancy</Text>
        </View>
      </View>
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>18a. Discrepancy Indication Space</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
              <Text style={styles.epaFormCellValue}>Quantity</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
              <Text style={styles.epaFormCellValue}>Type</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
              <Text style={styles.epaFormCellValue}>Residue</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
              <Text style={styles.epaFormCellValue}>Partial Rejection</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="check-box-outline-blank" size={18} color={colors.foreground} />
              <Text style={styles.epaFormCellValue}>Full Rejection</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabelSmall}>Manifest Reference Number:</Text>
        </View>
      </View>

      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>18b. Alternate Facility (or Generator)</Text>
        </View>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
        </View>
      </View>

      {/* Section 19: Hazardous Waste Report */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>19. Hazardous Waste Report Management Method Codes (i.e., codes for hazardous waste treatment, disposal, and recycling systems)</Text>
          <View style={{flexDirection: 'row'}}>
            <View style={{flex: 1}}>
              <Text style={styles.epaFormCellLabelSmall}>1.</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.epaFormCellLabelSmall}>2.</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.epaFormCellLabelSmall}>3.</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.epaFormCellLabelSmall}>4.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section 20: Designated Facility Certification */}
      <View style={styles.epaFormRow}>
        <View style={[styles.epaFormCell, {flex: 1}]}>
          <Text style={styles.epaFormCellLabel}>20. Designated Facility Owner or Operator: Certification of receipt of hazardous materials covered by the manifest except as noted in Item 18a</Text>
          <View style={styles.epaSignatureRow}>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Printed/Typed Name</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={{flex: 2}}>
              <Text style={styles.epaFormCellLabelSmall}>Signature</Text>
              <View style={styles.epaSignatureLine} />
            </View>
            <View style={styles.epaDateBox}>
              <Text style={styles.epaFormCellLabelSmall}>Month Day Year</Text>
              <View style={styles.epaDateRow}>
                <Text style={styles.epaDateValue} />
                <Text style={styles.epaDateValue} />
                <Text style={styles.epaDateValue} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.epaFormFooter}>
        <Text style={styles.epaFormFooterText}>EPA Form 8700-22 (Rev. 12-17) Previous editions are obsolete.</Text>
        <Text style={styles.epaFormFooterHighlight}>DESIGNATED FACILITY TO EPA's e-MANIFEST SYSTEM</Text>
      </View>
    </View>
  );
}

/** Straight Bill of Lading preview built from the collected containers. */
function renderBOLDocument(
  containers: AddedContainer[],
  totalNetWeight: number,
  bolNumber: string,
  dateStr: string,
) {
  return (
    <View style={docStyles.sheet}>
      <View style={docStyles.sheetTitleRow}>
        <Text style={docStyles.sheetTitle}>STRAIGHT BILL OF LADING</Text>
        <Text style={docStyles.sheetTitleSub}>Non-Negotiable</Text>
      </View>

      <View style={docStyles.metaRow}>
        <View style={docStyles.metaItem}>
          <Text style={docStyles.metaLabel}>BOL Number</Text>
          <Text style={docStyles.metaValue}>{bolNumber}</Text>
        </View>
        <View style={docStyles.metaItem}>
          <Text style={docStyles.metaLabel}>Date</Text>
          <Text style={docStyles.metaValue}>{dateStr}</Text>
        </View>
      </View>

      <View style={docStyles.partyRow}>
        <View style={docStyles.party}>
          <Text style={docStyles.partyLabel}>Ship From (Generator)</Text>
          <Text style={docStyles.partyName}>{GENERATOR.name}</Text>
          <Text style={docStyles.partyText}>{GENERATOR.address}</Text>
          <Text style={docStyles.partyText}>{GENERATOR.cityStateZip}</Text>
          <Text style={docStyles.partyText}>EPA ID: {GENERATOR.epaId}</Text>
        </View>
        <View style={docStyles.party}>
          <Text style={docStyles.partyLabel}>Ship To (Facility)</Text>
          <Text style={docStyles.partyName}>{FACILITY.name}</Text>
          <Text style={docStyles.partyText}>{FACILITY.address}</Text>
          <Text style={docStyles.partyText}>{FACILITY.cityStateZip}</Text>
          <Text style={docStyles.partyText}>EPA ID: {FACILITY.epaId}</Text>
        </View>
      </View>

      <View style={docStyles.carrierRow}>
        <Text style={docStyles.partyLabel}>Carrier</Text>
        <Text style={docStyles.partyName}>{TRANSPORTER.name}</Text>
        <Text style={docStyles.partyText}>EPA ID: {TRANSPORTER.epaId}</Text>
      </View>

      {/* Line items */}
      <View style={docStyles.table}>
        <View style={docStyles.tableHeaderRow}>
          <Text style={[docStyles.th, {width: 32}]}>#</Text>
          <Text style={[docStyles.th, {flex: 2.4}]}>Description</Text>
          <Text style={[docStyles.th, {flex: 1.3}]}>Container</Text>
          <Text style={[docStyles.th, {width: 70, textAlign: 'right'}]}>Net (lbs)</Text>
        </View>
        {containers.length > 0 ? (
          containers.map((c, idx) => (
            <View
              key={c.id}
              style={[
                docStyles.tableRow,
                idx % 2 === 1 && docStyles.tableRowAlt,
              ]}>
              <Text style={[docStyles.td, {width: 32}]}>{idx + 1}</Text>
              <Text style={[docStyles.td, {flex: 2.4}]} numberOfLines={2}>
                {c.streamName}
                {c.wasteCodes && c.wasteCodes.length > 0
                  ? `  (${c.wasteCodes.join(', ')})`
                  : ''}
              </Text>
              <Text style={[docStyles.td, {flex: 1.3}]} numberOfLines={1}>
                {c.containerSize} • {c.containerType}
              </Text>
              <Text style={[docStyles.td, {width: 70, textAlign: 'right'}]}>
                {c.netWeight}
              </Text>
            </View>
          ))
        ) : (
          <View style={docStyles.tableRow}>
            <Text style={[docStyles.td, {flex: 1}]}>No containers added.</Text>
          </View>
        )}
        <View style={docStyles.tableFooterRow}>
          <Text style={docStyles.tableFooterLabel}>
            Total ({containers.length} container
            {containers.length !== 1 ? 's' : ''})
          </Text>
          <Text style={docStyles.tableFooterValue}>{totalNetWeight} lbs</Text>
        </View>
      </View>

      <View style={docStyles.signRow}>
        <View style={docStyles.signBlock}>
          <View style={docStyles.signLine} />
          <Text style={docStyles.signLabel}>Shipper Signature / Date</Text>
        </View>
        <View style={docStyles.signBlock}>
          <View style={docStyles.signLine} />
          <Text style={docStyles.signLabel}>Carrier Signature / Date</Text>
        </View>
      </View>
    </View>
  );
}

/** Land Disposal Restrictions (40 CFR 268) notification / certification preview. */
function renderLDRDocument(
  wasteCodes: string[],
  trackingNumber: string,
  dateStr: string,
) {
  const codes = wasteCodes.length > 0 ? wasteCodes : ['—'];
  return (
    <View style={docStyles.sheet}>
      <View style={docStyles.sheetTitleRow}>
        <Text style={docStyles.sheetTitle}>
          LAND DISPOSAL RESTRICTIONS (LDR)
        </Text>
        <Text style={docStyles.sheetTitleSub}>
          Notification / Certification — 40 CFR 268.7
        </Text>
      </View>

      <View style={docStyles.metaRow}>
        <View style={docStyles.metaItem}>
          <Text style={docStyles.metaLabel}>Manifest Tracking #</Text>
          <Text style={docStyles.metaValue}>{trackingNumber}</Text>
        </View>
        <View style={docStyles.metaItem}>
          <Text style={docStyles.metaLabel}>Date</Text>
          <Text style={docStyles.metaValue}>{dateStr}</Text>
        </View>
      </View>

      <View style={docStyles.partyRow}>
        <View style={docStyles.party}>
          <Text style={docStyles.partyLabel}>Generator</Text>
          <Text style={docStyles.partyName}>{GENERATOR.name}</Text>
          <Text style={docStyles.partyText}>{GENERATOR.address}</Text>
          <Text style={docStyles.partyText}>{GENERATOR.cityStateZip}</Text>
          <Text style={docStyles.partyText}>EPA ID: {GENERATOR.epaId}</Text>
        </View>
        <View style={docStyles.party}>
          <Text style={docStyles.partyLabel}>Treatment Facility</Text>
          <Text style={docStyles.partyName}>{FACILITY.name}</Text>
          <Text style={docStyles.partyText}>{FACILITY.address}</Text>
          <Text style={docStyles.partyText}>{FACILITY.cityStateZip}</Text>
          <Text style={docStyles.partyText}>EPA ID: {FACILITY.epaId}</Text>
        </View>
      </View>

      <Text style={docStyles.sectionHeading}>
        Restricted Waste Codes &amp; Treatment Standards
      </Text>
      <View style={docStyles.table}>
        <View style={docStyles.tableHeaderRow}>
          <Text style={[docStyles.th, {width: 90}]}>Waste Code</Text>
          <Text style={[docStyles.th, {flex: 1}]}>Treatment Standard</Text>
        </View>
        {codes.map((code, idx) => (
          <View
            key={`${code}-${idx}`}
            style={[docStyles.tableRow, idx % 2 === 1 && docStyles.tableRowAlt]}>
            <Text style={[docStyles.td, {width: 90}]}>{code}</Text>
            <Text style={[docStyles.td, {flex: 1}]} numberOfLines={2}>
              Meets 40 CFR 268.40 treatment standards (subpart D)
            </Text>
          </View>
        ))}
      </View>

      <Text style={docStyles.certText}>
        I certify under penalty of law that I personally have examined and am
        familiar with the waste through analysis and testing or through
        knowledge of the waste to support this certification that the waste
        complies with the treatment standards specified in 40 CFR Part 268
        Subpart D and all applicable prohibitions set forth in 40 CFR 268.32 or
        RCRA section 3004(d).
      </Text>

      <View style={docStyles.signRow}>
        <View style={docStyles.signBlock}>
          <View style={docStyles.signLine} />
          <Text style={docStyles.signLabel}>Authorized Signature</Text>
        </View>
        <View style={docStyles.signBlock}>
          <View style={docStyles.signLine} />
          <Text style={docStyles.signLabel}>Printed Name / Date</Text>
        </View>
      </View>
    </View>
  );
}

const docStyles = StyleSheet.create({
  footerPrintButton: {
    flex: 1,
  },
  printedAllNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.success}14`,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  printedAllNoticeText: {
    ...typography.sm,
    color: colors.foreground,
    flex: 1,
    minWidth: 0,
  },
  card: {
    marginBottom: spacing.xl,
  },
  cardHeaderText: {
    minWidth: 0,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  sheet: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  sheetTitleRow: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.foreground,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.lg,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sheetTitleSub: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  partyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  party: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  carrierRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  partyLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs / 2,
  },
  partyName: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
  },
  partyText: {
    ...typography.sm,
    color: colors.foreground,
  },
  sectionHeading: {
    ...typography.sm,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  th: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  td: {
    ...typography.sm,
    color: colors.foreground,
    paddingRight: spacing.xs,
  },
  tableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.muted,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  tableFooterLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableFooterValue: {
    ...typography.base,
    fontWeight: '700',
    color: colors.primary,
  },
  certText: {
    ...typography.sm,
    color: colors.foreground,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  signRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  signBlock: {
    flex: 1,
    minWidth: 0,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.foreground,
    height: spacing.xl,
  },
  signLabel: {
    ...typography.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
});

const splitStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    minHeight: 56,
  },
  wrapDisabled: {
    opacity: 0.5,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    ...typography.base,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  divider: {
    width: 1,
    backgroundColor: `${colors.primaryForeground}55`,
  },
  caret: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  menuTitle: {
    ...typography.sm,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  menuItemText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
});
