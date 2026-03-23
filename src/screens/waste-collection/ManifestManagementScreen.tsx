import React, {useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import SignatureCanvas from '../../components/SignatureCanvas';
import {Button} from '../../components/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from '../../components/Card';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {
  OrderData,
  FlowStep,
  AddedContainer,
  ScannedDocument,
} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {colors, spacing, borderRadius} from '../../styles/theme';
import {styles} from './styles';

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

  // Manifest-specific props
  addedContainers: AddedContainer[];
  manifestTrackingNumber: string | null;
  manifestData: {
    trackingNumber?: string;
    createdAt?: Date;
    scannedImageUri?: string;
    signatureImageUri?: string;
  } | null;
  setManifestData: (data: any) => void;
  scannedDocuments: ScannedDocument[];
  showSignatureModal: boolean;
  setShowSignatureModal: (show: boolean) => void;
  showPrintPreview: boolean;
  setShowPrintPreview: (show: boolean) => void;
  showPrintOptions: boolean;
  setShowPrintOptions: (show: boolean) => void;
  signatureRef: React.RefObject<any>;
  voidManifest: () => void;
  printManifest: () => Promise<void>;
  printLDR: () => Promise<void>;
  setPendingDocumentType: (type: 'manifest' | 'ldr' | 'bol' | null) => void;
  setCaptureFromManifestScanView: (value: boolean) => void;
  setShowCaptureMethodSelector: (show: boolean) => void;
  setSelectedOrderData: (order: OrderData | null) => void;
}

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
  manifestData,
  setManifestData,
  scannedDocuments,
  showSignatureModal,
  setShowSignatureModal,
  showPrintPreview,
  setShowPrintPreview,
  showPrintOptions,
  setShowPrintOptions,
  signatureRef,
  voidManifest,
  printManifest,
  printLDR,
  setPendingDocumentType,
  setCaptureFromManifestScanView,
  setShowCaptureMethodSelector,
  setSelectedOrderData,
}) => {
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

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
        subtitle="Manifest Shipment"
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

      <View style={styles.scrollViewContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <Card style={styles.manifestShipmentCard}>
            <CardHeader>
              <CardTitle>
                <CardTitleText>Manifest Shipment</CardTitleText>
              </CardTitle>
              <Text style={styles.manifestShipmentSubtitle}>
                Review and sign your shipment manifest, then continue when ready.
              </Text>
            </CardHeader>
            <CardContent>
              <View style={styles.manifestSummarySection}>
                <View style={styles.manifestSummaryRow}>
                  <View style={styles.manifestSummaryItem}>
                    <Text style={styles.manifestSummaryLabel}>
                      Total Containers
                    </Text>
                    <Text style={styles.manifestSummaryValue}>
                      {addedContainers.length}
                    </Text>
                  </View>
                  {manifestTrackingNumber ? (
                    <>
                      <View style={styles.manifestSummaryDivider} />
                      <View style={styles.manifestSummaryItem}>
                        <Text style={styles.manifestSummaryLabel}>
                          Tracking Number
                        </Text>
                        <Text
                          style={[
                            styles.manifestSummaryValue,
                            styles.trackingNumber,
                          ]}>
                          {manifestTrackingNumber}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>

              {(manifestData?.scannedImageUri ||
                scannedDocuments.some(
                  doc =>
                    doc.orderNumber === selectedOrderData?.orderNumber &&
                    doc.documentType === 'manifest',
                )) ? (
                <View style={styles.scannedImageIndicator}>
                  <View style={styles.manifestSuccessRow}>
                    <Icon name="check-circle" size={18} color={colors.success} style={styles.manifestSuccessIcon} />
                    <Text style={styles.scannedImageText}>
                      Manifest document scanned and uploaded
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.manifestActionsInCard}>
                <Text style={styles.manifestActionsLabel}>Manifest actions</Text>
                <View style={styles.manifestActionsRow}>
                  <Button
                    title="Scan Manifest"
                    variant="outline"
                    size="md"
                    disabled={isCurrentOrderCompleted}
                    onPress={() => {
                      setPendingDocumentType('manifest');
                      setCaptureFromManifestScanView(true);
                      setShowCaptureMethodSelector(true);
                    }}
                    style={styles.manifestActionButton}
                  />
                  <Button
                    title="Sign Manifest"
                    variant="outline"
                    size="md"
                    disabled={isCurrentOrderCompleted}
                    onPress={() => setShowSignatureModal(true)}
                    style={styles.manifestActionButton}
                  />
                  <Button
                    title="Print Options"
                    variant="outline"
                    size="md"
                    disabled={isCurrentOrderCompleted}
                    onPress={() => setShowPrintOptions(true)}
                    style={styles.manifestActionButton}
                  />
                  {manifestTrackingNumber ? (
                    <Button
                      title="Void manifest"
                      variant="destructive"
                      size="md"
                      disabled={isCurrentOrderCompleted}
                      onPress={voidManifest}
                      style={styles.manifestActionButton}
                    />
                  ) : null}
                </View>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          onPress={() => setCurrentStep('containers-review')}
        />
        <Button
          title="Continue"
          variant="primary"
          size="md"
          disabled={isCurrentOrderCompleted}
          onPress={() => {
            if (!isCurrentOrderCompleted) {
              // Skip materials-supplies and equipment - accessible from quick actions
              // Go directly to order completion/service summary
              setCurrentStep('order-service');
            }
          }}
        />
      </View>

      {/* Signature Modal */}
      <Modal
        visible={showSignatureModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowSignatureModal(false)}>
        <SafeAreaView style={styles.signatureModalContainer}>
          <View style={styles.signatureModalHeader}>
            <Text style={styles.signatureModalTitle}>Sign Manifest</Text>
            <TouchableOpacity
              onPress={() => setShowSignatureModal(false)}
              style={styles.signatureModalCloseBtn}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.signatureCanvasContainer}>
            <Text style={styles.signatureModalTitle}>Signature Area</Text>
            <View style={{
              flex: 1,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginBottom: spacing.md,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={(signature: string) => {
                  setManifestData((prev: any) => ({
                    ...prev,
                    signatureImageUri: signature,
                  }));
                  setShowSignatureModal(false);
                }}
                onEmpty={() => {
                  Alert.alert('Please Sign', 'Please provide a signature before saving.');
                }}
                penColor="#000000"
                strokeWidth={3}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button
                title="Clear"
                onPress={() => signatureRef.current?.clearSignature()}
                variant="outline"
              />
              <Button
                title="Cancel"
                onPress={() => setShowSignatureModal(false)}
                variant="outline"
              />
              <Button
                title="Save"
                onPress={() => signatureRef.current?.readSignature()}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Print Preview Modal - EPA Uniform Hazardous Waste Manifest */}
      <Modal
        visible={showPrintPreview}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowPrintPreview(false)}>
        <SafeAreaView style={styles.manifestPreviewContainer}>
          {/* Header Bar */}
          <View style={styles.manifestPreviewHeader}>
            <Text style={styles.manifestPreviewHeaderTitle}>
              Manifest Print Preview
            </Text>
            <TouchableOpacity
              onPress={() => setShowPrintPreview(false)}
              style={styles.manifestPreviewCloseBtn}>
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.manifestPreviewScroll}>
            {/* EPA Form Container */}
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
                  <Text style={styles.epaFormCellValue}>CAL000483809</Text>
                </View>
                <View style={[styles.epaFormCell, {width: 60}]}>
                  <Text style={styles.epaFormCellLabel}>2. Page 1 of</Text>
                  <Text style={styles.epaFormCellValue}>1</Text>
                </View>
                <View style={[styles.epaFormCell, {flex: 1}]}>
                  <Text style={styles.epaFormCellLabel}>3. Emergency Response Phone</Text>
                  <Text style={styles.epaFormCellValue}>(877) 577-2669</Text>
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
                  <Text style={styles.epaFormCellValue}>Attn: William Quila</Text>
                  <Text style={styles.epaFormCellValueBold}>Soleo Health</Text>
                  <Text style={styles.epaFormCellValue}>1324 W Winton Ave</Text>
                  <Text style={styles.epaFormCellValue}>Hayward, CA 94545-1408 Ph: (510) 362-7360</Text>
                  <Text style={styles.epaFormCellLabelSmall}>Generator's Phone:</Text>
                </View>
                <View style={[styles.epaFormCell, {flex: 1}]}>
                  <Text style={styles.epaFormCellLabel}>Generator's Site Address (if different than mailing address)</Text>
                  <Text style={styles.epaFormCellValueBold}>Soleo Health</Text>
                  <Text style={styles.epaFormCellValue}>1324 W Winton Ave</Text>
                  <Text style={styles.epaFormCellValue}>Hayward, CA 94545-1408 Ph: (510) 362-7360</Text>
                </View>
              </View>

              {/* Section 6: Transporter 1 */}
              <View style={styles.epaFormRow}>
                <View style={[styles.epaFormCell, {flex: 2}]}>
                  <Text style={styles.epaFormCellLabel}>6. Transporter 1 Company Name</Text>
                  <Text style={styles.epaFormCellValueBold}>Clean Earth Specialty Waste Solutions, Inc.</Text>
                </View>
                <View style={[styles.epaFormCell, {flex: 1}]}>
                  <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                  <Text style={styles.epaFormCellValue}>MNS000110924</Text>
                </View>
              </View>

              {/* Section 7: Transporter 2 */}
              <View style={styles.epaFormRow}>
                <View style={[styles.epaFormCell, {flex: 2}]}>
                  <Text style={styles.epaFormCellLabel}>7. Transporter 2 Company Name</Text>
                  <Text style={styles.epaFormCellValue}></Text>
                </View>
                <View style={[styles.epaFormCell, {flex: 1}]}>
                  <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                  <Text style={styles.epaFormCellValue}></Text>
                </View>
              </View>

              {/* Section 8: Designated Facility */}
              <View style={styles.epaFormRow}>
                <View style={[styles.epaFormCell, {flex: 2}]}>
                  <Text style={styles.epaFormCellLabel}>8. Designated Facility Name and Site Address</Text>
                  <Text style={styles.epaFormCellValueBold}>Clean Earth of Alabama, Inc.</Text>
                  <Text style={styles.epaFormCellValue}>402 Webster Chapel Road</Text>
                  <Text style={styles.epaFormCellValue}>Glencoe, AL 35905</Text>
                  <Text style={styles.epaFormCellLabelSmall}>Facility's Phone: 8007399156</Text>
                </View>
                <View style={[styles.epaFormCell, {flex: 1}]}>
                  <Text style={styles.epaFormCellLabel}>U.S. EPA ID Number</Text>
                  <Text style={styles.epaFormCellValueBold}>ALD981020894</Text>
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
                      {manifestData?.signatureImageUri ? (
                        <Image
                          source={{uri: manifestData.signatureImageUri}}
                          style={{
                            height: 40,
                            width: '100%',
                            borderWidth: 1,
                            borderColor: '#000000',
                            borderRadius: borderRadius.sm,
                          }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.epaSignatureLine} />
                      )}
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
                        <Text style={styles.epaDateValue}></Text>
                        <Text style={styles.epaDateValue}></Text>
                        <Text style={styles.epaDateValue}></Text>
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
                        <Text style={styles.epaDateValue}></Text>
                        <Text style={styles.epaDateValue}></Text>
                        <Text style={styles.epaDateValue}></Text>
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
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.manifestPreviewFooter}>
            <Button
              title="Close"
              variant="outline"
              size="lg"
              onPress={() => setShowPrintPreview(false)}
              style={{flex: 1}}
            />
            <Button
              title="Print Manifest"
              variant="primary"
              size="lg"
              onPress={async () => {
                setShowPrintPreview(false);
                await printManifest();
              }}
              style={{flex: 1}}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Print Options Modal */}
      <Modal
        visible={showPrintOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrintOptions(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={{flex: 1}}
            activeOpacity={1}
            onPress={() => setShowPrintOptions(false)}
          />
          <View style={styles.bottomSheetContent}>
            {/* Bottom Sheet Handle */}
            <View style={styles.bottomSheetHandle} />

            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Print Options</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.bottomSheetBodyContent}
              showsVerticalScrollIndicator={true}>
              <TouchableOpacity
                style={styles.bottomSheetOptionButton}
                onPress={() => {
                  setShowPrintOptions(false);
                  setShowPrintPreview(true);
                }}
                activeOpacity={0.7}>
                <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#E0E7FF'}]}>
                  <Icon name="visibility" size={24} color={colors.foreground} />
                </View>
                <View style={styles.bottomSheetOptionInfo}>
                  <Text style={styles.bottomSheetOptionLabel}>Print Preview</Text>
                  <Text style={styles.bottomSheetOptionDesc}>
                    Preview the manifest before printing
                  </Text>
                </View>
                <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomSheetOptionButton}
                onPress={async () => {
                  setShowPrintOptions(false);
                  await printManifest();
                }}
                activeOpacity={0.7}>
                <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                  <Icon name="print" size={24} color={colors.foreground} />
                </View>
                <View style={styles.bottomSheetOptionInfo}>
                  <Text style={styles.bottomSheetOptionLabel}>Print Manifest</Text>
                  <Text style={styles.bottomSheetOptionDesc}>
                    Print the hazardous waste manifest document
                  </Text>
                </View>
                <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomSheetOptionButton}
                onPress={async () => {
                  setShowPrintOptions(false);
                  await printLDR();
                }}
                activeOpacity={0.7}>
                <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                  <Icon name="description" size={24} color={colors.foreground} />
                </View>
                <View style={styles.bottomSheetOptionInfo}>
                  <Text style={styles.bottomSheetOptionLabel}>Print LDR</Text>
                  <Text style={styles.bottomSheetOptionDesc}>
                    Print the Land Disposal Restrictions notification
                  </Text>
                </View>
                <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.bottomSheetFooter}>
              <TouchableOpacity
                style={styles.bottomSheetCancelButton}
                onPress={() => setShowPrintOptions(false)}>
                <Text style={styles.bottomSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
