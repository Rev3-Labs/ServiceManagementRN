import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {Button} from '../../components/Button';
import {OrderData} from '../../types/wasteCollection';
import {serviceTypeService} from '../../services/serviceTypeService';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

export interface AcknowledgeServiceNotesModalProps {
  visible: boolean;
  order: OrderData | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatOrderLocation(order: OrderData): string {
  return [order.site, order.city, order.state, order.zip]
    .filter(Boolean)
    .join(', ');
}

function formatServiceRequestTypes(order: OrderData): string {
  return order.programs
    .map(program => {
      const serviceOrderNumber = order.serviceOrderNumbers?.[program];
      const label = serviceTypeService.formatForOrderDetails(program);
      return serviceOrderNumber ? `${label} • ${serviceOrderNumber}` : label;
    })
    .join('\n');
}

export const AcknowledgeServiceNotesModal: React.FC<
  AcknowledgeServiceNotesModalProps
> = ({visible, order, onCancel, onConfirm}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Continue?</Text>
          <Text style={styles.message}>
            Are you sure you want to continue?
          </Text>
          {order ? (
            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsContent}>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Customer</Text>
                <Text style={styles.detailValue}>{order.customer}</Text>
              </View>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Site</Text>
                <Text style={styles.detailValue}>{order.site}</Text>
              </View>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {formatOrderLocation(order)}
                </Text>
              </View>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Service Request</Text>
                <Text style={styles.detailValue}>
                  {formatServiceRequestTypes(order)}
                </Text>
              </View>
            </ScrollView>
          ) : null}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              onPress={onCancel}
              style={styles.footerButton}
            />
            <Button
              title="Continue"
              variant="primary"
              size="md"
              onPress={onConfirm}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  detailsScroll: {
    maxHeight: 280,
    marginBottom: spacing.md,
  },
  detailsContent: {
    gap: spacing.md,
  },
  detailBlock: {
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    ...typography.base,
    color: colors.foreground,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  footerButton: {
    minWidth: 120,
  },
});
