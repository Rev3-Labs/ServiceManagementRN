import React from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {Button} from '../Button';
import {colors} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppProgressModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** When set, shows Cancel and allows Android back to cancel. */
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * Progress — work is running; user waits.
 * No primary buttons. Optional Cancel only when the job is safely abortable.
 * Use for generate manifest / sync. Prefer non-blocking toast for print-only jobs.
 */
export const AppProgressModal: React.FC<AppProgressModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  cancelLabel = 'Cancel',
}) => {
  const canCancel = Boolean(onCancel);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={canCancel ? onCancel : () => {}}>
      <Pressable style={styles.overlay} onPress={() => {}}>
        <View style={styles.card}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.progressSpinner}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {canCancel ? (
            <View style={[styles.footer, styles.footerCentered]}>
              <Button
                title={cancelLabel}
                variant="outline"
                size="md"
                onPress={onCancel!}
                style={styles.footerButton}
              />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
};
