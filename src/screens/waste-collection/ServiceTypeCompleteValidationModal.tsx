import React from 'react';
import {View, Text, Modal, StyleSheet} from 'react-native';
import {Button} from '../../components/Button';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

export interface ServiceTypeCompleteValidationModalProps {
  visible: boolean;
  onNo: () => void;
  onYes: () => void;
}

/**
 * Soft-validation reminder before marking a service type complete.
 * Acknowledgment only — does not check or add materials, equipment, or photos.
 */
export const ServiceTypeCompleteValidationModal: React.FC<
  ServiceTypeCompleteValidationModalProps
> = ({visible, onNo, onYes}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNo}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm before completing</Text>
          <Text style={styles.message}>
            Have you added all Materials/Supplies, Equipment, and required
            photos for this service request?
          </Text>
          <Text style={styles.supporting}>
            This does not add items automatically — please verify before
            continuing.
          </Text>
          <View style={styles.footer}>
            <Button
              title="No"
              variant="outline"
              size="md"
              onPress={onNo}
              style={styles.footerButton}
            />
            <Button
              title="Yes"
              variant="primary"
              size="md"
              onPress={onYes}
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
    marginBottom: spacing.sm,
  },
  supporting: {
    ...typography.sm,
    color: colors.mutedForeground,
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
