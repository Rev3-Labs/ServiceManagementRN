import React from 'react';
import {View, Text, Modal, StyleSheet} from 'react-native';
import {Button} from '../../components/Button';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

export type IncompleteOrderDataLossPhase = 'confirm' | 'cleared';

export interface IncompleteOrderDataLossModalProps {
  visible: boolean;
  workOrderNumber: string;
  phase?: IncompleteOrderDataLossPhase;
  onClearData: () => void;
  onReview: () => void;
  /** Dismiss after successful clear (OK / Close). */
  onCloseCleared: () => void;
}

export const IncompleteOrderDataLossModal: React.FC<
  IncompleteOrderDataLossModalProps
> = ({
  visible,
  workOrderNumber,
  phase = 'confirm',
  onClearData,
  onReview,
  onCloseCleared,
}) => {
  const isCleared = phase === 'cleared';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isCleared ? onCloseCleared : onReview}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isCleared ? 'Order Reset' : 'Incomplete Order Found'}
          </Text>
          {isCleared ? (
            <Text style={styles.message}>
              Your work order
              {workOrderNumber ? ` ${workOrderNumber}` : ''} has been reset and
              all data has been wiped out.
            </Text>
          ) : (
            <Text style={styles.message}>
              You have an incomplete order
              {workOrderNumber ? ` ${workOrderNumber}` : ''}.{'\n\n'}
              If you proceed, all your data (including containers,
              materials/supplies, equipment, and/or photos) will be wiped from
              the previous order.
            </Text>
          )}
          <View style={styles.footer}>
            {isCleared ? (
              <Button
                title="OK"
                variant="primary"
                size="md"
                onPress={onCloseCleared}
                style={styles.footerButton}
              />
            ) : (
              <>
                <Button
                  title="No, Review"
                  variant="outline"
                  size="md"
                  onPress={onReview}
                  style={styles.footerButton}
                />
                <Button
                  title="Yes, Clear Data"
                  variant="destructive"
                  size="md"
                  onPress={onClearData}
                  style={styles.footerButton}
                />
              </>
            )}
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
    flexWrap: 'wrap',
  },
  footerButton: {
    minWidth: 120,
  },
});
