import React from 'react';
import {View, Text, Modal, StyleSheet, TouchableOpacity} from 'react-native';
import {Button} from '../Button';
import {Icon} from '../Icon';
import {colors, spacing, typography} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** Primary recovery action (preferred). */
  onRetry?: () => void;
  retryLabel?: string;
  /** Dismiss without retry. */
  onOk?: () => void;
  okLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  onContactSupport?: () => void;
  contactSupportLabel?: string;
}

/**
 * Error — the action failed.
 * Prefer Retry when the operation can be repeated; otherwise OK.
 * Actions stack vertically for clear hierarchy on tablet widths.
 */
export const AppErrorModal: React.FC<AppErrorModalProps> = ({
  visible,
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  onOk,
  okLabel = 'OK',
  onCancel,
  cancelLabel = 'Cancel',
  onContactSupport,
  contactSupportLabel = 'Contact support',
}) => {
  const dismiss = onCancel ?? onOk ?? (() => {});
  const primaryAction = onRetry
    ? {label: retryLabel, onPress: onRetry}
    : onOk
      ? {label: okLabel, onPress: onOk}
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View style={localStyles.errorIconWrap}>
              <Icon name="error" size={40} color={colors.destructive} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={localStyles.actions}>
            {primaryAction ? (
              <Button
                title={primaryAction.label}
                variant="primary"
                size="lg"
                fullWidth
                onPress={primaryAction.onPress}
              />
            ) : null}
            {onCancel ? (
              <Button
                title={cancelLabel}
                variant="outline"
                size="lg"
                fullWidth
                onPress={onCancel}
              />
            ) : null}
            {onContactSupport ? (
              <TouchableOpacity
                onPress={onContactSupport}
                style={localStyles.supportLink}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                accessibilityRole="button"
                accessibilityLabel={contactSupportLabel}>
                <Text style={localStyles.supportLinkText}>
                  {contactSupportLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.destructive + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  supportLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  supportLinkText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
