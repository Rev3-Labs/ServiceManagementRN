import React from 'react';
import {View, Text, Modal} from 'react-native';
import {Button} from '../Button';
import {Icon} from '../Icon';
import {colors} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppSuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onOk: () => void;
  okLabel?: string;
}

/**
 * Success — a milestone finished that needs acknowledgment before leaving.
 * For routine status (photo saved, label sent), prefer showToast() instead.
 */
export const AppSuccessModal: React.FC<AppSuccessModalProps> = ({
  visible,
  title,
  message,
  onOk,
  okLabel = 'OK',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onOk}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View
              style={[styles.iconWrap, {backgroundColor: colors.success + '18'}]}>
              <Icon name="check-circle" size={32} color={colors.success} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={[styles.footer, styles.footerCentered]}>
            <Button
              title={okLabel}
              variant="primary"
              size="md"
              onPress={onOk}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
