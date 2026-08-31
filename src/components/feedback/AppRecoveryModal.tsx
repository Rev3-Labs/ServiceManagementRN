import React from 'react';
import {View, Text, Modal, StyleSheet, TouchableOpacity} from 'react-native';
import {Button} from '../Button';
import {Icon} from '../Icon';
import {colors, spacing, typography} from '../../styles/theme';
import {feedbackModalStyles as styles} from './feedbackModalStyles';

export interface AppRecoveryModalProps {
  visible: boolean;
  title: string;
  message: string;
  /** What is missing / jammed (optional secondary line). */
  detail?: string;
  onRetry: () => void;
  onOpenSettings: () => void;
  retryLabel?: string;
  openSettingsLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * Recovery — hardware or permission is missing.
 * Distinct from Error: primary path is fix environment (Settings) then Retry.
 */
export const AppRecoveryModal: React.FC<AppRecoveryModalProps> = ({
  visible,
  title,
  message,
  detail,
  onRetry,
  onOpenSettings,
  retryLabel = 'Retry',
  openSettingsLabel = 'Open Settings',
  onCancel,
  cancelLabel = 'Cancel',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel ?? onRetry}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View style={localStyles.iconWrap}>
              <Icon name="build" size={36} color={colors.info} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          <View style={localStyles.actions}>
            <Button
              title={retryLabel}
              variant="primary"
              size="lg"
              fullWidth
              onPress={onRetry}
            />
            <Button
              title={openSettingsLabel}
              variant="outline"
              size="lg"
              fullWidth
              onPress={onOpenSettings}
            />
            {onCancel ? (
              <TouchableOpacity
                onPress={onCancel}
                style={localStyles.cancelLink}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}>
                <Text style={localStyles.cancelLinkText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.info + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  cancelLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  cancelLinkText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
});
