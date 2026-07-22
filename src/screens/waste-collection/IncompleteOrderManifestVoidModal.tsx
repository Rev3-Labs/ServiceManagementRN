import React from 'react';
import {View, Text, Modal, StyleSheet} from 'react-native';
import {Button} from '../../components/Button';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

export interface IncompleteOrderManifestVoidModalProps {
  visible: boolean;
  workOrderNumber: string;
  onProceed: () => void;
}

export const IncompleteOrderManifestVoidModal: React.FC<
  IncompleteOrderManifestVoidModalProps
> = ({visible, workOrderNumber, onProceed}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onProceed}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            Incomplete Order Found {workOrderNumber} with a manifest
          </Text>
          <Text style={styles.message}>
            You have an incomplete order {workOrderNumber} with a manifest
            generated. Please void the manifest before you proceed.
          </Text>
          <View style={styles.footer}>
            <Button
              title="Go to Incomplete Order"
              variant="primary"
              size="md"
              onPress={onProceed}
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
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  footerButton: {
    minWidth: 120,
  },
});
