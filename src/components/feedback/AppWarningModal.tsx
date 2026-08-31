import React from 'react';
import {View, Text, Modal} from 'react-native';
import {Button} from '../Button';
import {Icon} from '../Icon';
import {colors} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppWarningModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onContinue: () => void;
  cancelLabel?: string;
  continueLabel?: string;
}

/**
 * Warning — unusual situation; user may still continue.
 * Continue is primary (not destructive red). Use Confirmation for deletes/voids.
 */
export const AppWarningModal: React.FC<AppWarningModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  onContinue,
  cancelLabel = 'Cancel',
  continueLabel = 'Continue',
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
              style={[styles.iconWrap, {backgroundColor: colors.warning + '18'}]}>
              <Icon name="warning" size={32} color={colors.warning} />
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
              title={continueLabel}
              variant="primary"
              size="md"
              onPress={onContinue}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
