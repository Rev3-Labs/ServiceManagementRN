import React from 'react';
import {View, Text, Modal} from 'react-native';
import {Button} from '../Button';
import {Icon} from '../Icon';
import {colors} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  /** When true, confirm uses destructive styling (deletes). Default true. */
  destructive?: boolean;
}

/**
 * Confirmation — ask before a destructive or irreversible step.
 * Cancel + Confirm (red when destructive).
 */
export const AppConfirmModal: React.FC<AppConfirmModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = true,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: destructive
                    ? colors.destructive + '18'
                    : colors.primary + '18',
                },
              ]}>
              <Icon
                name={destructive ? 'delete' : 'help'}
                size={32}
                color={destructive ? colors.destructive : colors.primary}
              />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.footer}>
            <Button
              title={cancelLabel}
              variant="outline"
              size="md"
              onPress={onCancel}
              style={styles.footerButton}
            />
            <Button
              title={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
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
