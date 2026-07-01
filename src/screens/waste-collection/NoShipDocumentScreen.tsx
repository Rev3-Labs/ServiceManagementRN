import React, {useEffect, useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {Button} from '../../components/Button';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {OrderData, FlowStep} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {serviceTypeService} from '../../services/serviceTypeService';
import {
  getNoShipReasonLabel,
  type NoShipReasonCode,
} from '../../constants/noShipReasons';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {styles} from './styles';

/** A single No-Ship service type record for the current order. */
export interface NoShipItem {
  serviceTypeId: string;
  reasonCode: NoShipReasonCode;
  notes?: string;
}

export interface NoShipDocumentScreenProps {
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

  // No-Ship specific
  noShipItems: NoShipItem[];
  printNoShip: () => Promise<void>;
  setSelectedOrderData: (order: OrderData | null) => void;
}

export const NoShipDocumentScreen: React.FC<NoShipDocumentScreenProps> = ({
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
  noShipItems,
  printNoShip,
  setSelectedOrderData,
}) => {
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now
      .getDate()
      .toString()
      .padStart(2, '0')}/${now.getFullYear()}`;
  }, []);

  // Completed orders cannot open documentation — redirect to dashboard
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
        onBackPress={() => setCurrentStep('manifest-management')}
        subtitle="No-Ship Documentation"
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
        <Text style={ns.cardTitle}>No-Ship Certificate</Text>
        <Text style={ns.cardSubtitle}>
          Documentation of service types not shipped on this order.
        </Text>

        <View style={ns.sheet}>
          <View style={ns.sheetTitleRow}>
            <Text style={ns.sheetTitle}>CERTIFICATE OF NO-SHIP</Text>
            <Text style={ns.sheetTitleSub}>Service Documentation</Text>
          </View>

          <View style={ns.metaRow}>
            <View style={ns.metaItem}>
              <Text style={ns.metaLabel}>Order</Text>
              <Text style={ns.metaValue}>{selectedOrderData.orderNumber}</Text>
            </View>
            <View style={ns.metaItem}>
              <Text style={ns.metaLabel}>Date</Text>
              <Text style={ns.metaValue}>{todayStr}</Text>
            </View>
          </View>

          <View style={ns.party}>
            <Text style={ns.partyLabel}>Generator / Site</Text>
            <Text style={ns.partyName}>{selectedOrderData.customer}</Text>
            <Text style={ns.partyText}>{selectedOrderData.site}</Text>
            <Text style={ns.partyText}>
              {selectedOrderData.city}, {selectedOrderData.state}
              {selectedOrderData.zip ? ` ${selectedOrderData.zip}` : ''}
            </Text>
            {selectedOrderData.genNumber ? (
              <Text style={ns.partyText}>
                Generator #: {selectedOrderData.genNumber}
              </Text>
            ) : null}
          </View>

          <Text style={ns.sectionHeading}>No-Ship Service Types</Text>
          <View style={ns.table}>
            <View style={ns.tableHeaderRow}>
              <Text style={[ns.th, {flex: 1.4}]}>Service Type</Text>
              <Text style={[ns.th, {width: 90}]}>Reason Code</Text>
              <Text style={[ns.th, {flex: 1.6}]}>Reason / Notes</Text>
            </View>
            {noShipItems.length > 0 ? (
              noShipItems.map((item, idx) => (
                <View
                  key={item.serviceTypeId}
                  style={[ns.tableRow, idx % 2 === 1 && ns.tableRowAlt]}>
                  <Text style={[ns.td, {flex: 1.4}]} numberOfLines={2}>
                    {serviceTypeService.formatForBadge(item.serviceTypeId)}
                  </Text>
                  <Text style={[ns.td, ns.tdMono, {width: 90}]}>
                    {item.reasonCode}
                  </Text>
                  <Text style={[ns.td, {flex: 1.6}]} numberOfLines={3}>
                    {getNoShipReasonLabel(item.reasonCode)}
                    {item.notes ? ` — ${item.notes}` : ''}
                  </Text>
                </View>
              ))
            ) : (
              <View style={ns.tableRow}>
                <Text style={[ns.td, {flex: 1}]}>
                  No no-ship service types recorded.
                </Text>
              </View>
            )}
          </View>

          <Text style={ns.certText}>
            I certify that the service type(s) listed above were not shipped on
            this order for the reason(s) indicated, and that the information
            recorded is accurate to the best of my knowledge.
          </Text>

          <View style={ns.signRow}>
            <View style={ns.signBlock}>
              <View style={ns.signLine} />
              <Text style={ns.signLabel}>Technician Signature</Text>
            </View>
            <View style={ns.signBlock}>
              <View style={ns.signLine} />
              <Text style={ns.signLabel}>Date</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          onPress={() => setCurrentStep('manifest-management')}
        />
        <Button
          title="Print No-Ship"
          variant="outline"
          size="md"
          disabled={isCurrentOrderCompleted}
          onPress={printNoShip}
        />
        <Button
          title="Continue"
          variant="primary"
          size="md"
          disabled={isCurrentOrderCompleted}
          onPress={() => {
            if (!isCurrentOrderCompleted) {
              setCurrentStep('order-service');
            }
          }}
        />
      </View>
    </View>
  );
};

const ns = StyleSheet.create({
  cardTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardSubtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
    marginBottom: spacing.md,
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
  party: {
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
  tdMono: {
    fontFamily: 'monospace',
    fontWeight: '700',
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
