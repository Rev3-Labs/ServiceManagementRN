import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
} from 'react-native';
import {Button} from '../../components/Button';
import {OrderData} from '../../types/wasteCollection';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

export interface AcknowledgeServiceNotesModalProps {
  visible: boolean;
  order: OrderData | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatOrderSummary(order: OrderData): string {
  const address = [order.city, order.state, order.zip].filter(Boolean).join(', ');
  return [order.customer, order.site, address].filter(Boolean).join('\n');
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
          <Text style={styles.title}>Verify Location</Text>
          <Text style={styles.message}>
            Confirm you are at the correct service location before continuing.
          </Text>
          {order ? (
            <Text style={styles.detailValue}>{formatOrderSummary(order)}</Text>
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
              title="Confirm Location"
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
  detailValue: {
    ...typography.base,
    color: colors.foreground,
    lineHeight: 22,
    marginBottom: spacing.md,
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
