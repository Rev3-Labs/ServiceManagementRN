import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {Button} from '../../components/Button';
import {Icon} from '../../components/Icon';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  touchTargets,
} from '../../styles/theme';

export const WORK_ORDER_NOTES_MAX_LENGTH = 1000;

export type WorkOrderNotesModalMode = 'edit' | 'completion';

export interface WorkOrderNotesModalProps {
  visible: boolean;
  mode: WorkOrderNotesModalMode;
  initialNotes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
  /** Completion mode only: continue without saving notes. */
  onSkip?: () => void;
}

export const WorkOrderNotesModal: React.FC<WorkOrderNotesModalProps> = ({
  visible,
  mode,
  initialNotes,
  onClose,
  onSave,
  onSkip,
}) => {
  const [draft, setDraft] = useState(initialNotes);

  useEffect(() => {
    if (visible) {
      setDraft(initialNotes);
    }
  }, [visible, initialNotes]);

  const handleSave = () => {
    onSave(draft.trim());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>Work Order Notes</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              accessibilityLabel="Close"
              accessibilityRole="button">
              <Icon name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.message}>
              Enter any additional notes related to this work order.
            </Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Enter any work order notes (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              maxLength={WORK_ORDER_NOTES_MAX_LENGTH}
              accessibilityLabel="Work order notes"
            />
            <Text style={styles.charCount}>
              {draft.length}/{WORK_ORDER_NOTES_MAX_LENGTH}
            </Text>
          </View>

          <View style={styles.footer}>
            {mode === 'edit' ? (
              <>
                <Button
                  title="Close"
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  style={styles.footerButton}
                />
                <Button
                  title="Save Notes"
                  variant="primary"
                  size="md"
                  onPress={handleSave}
                  style={styles.footerButton}
                />
              </>
            ) : (
              <>
                <Button
                  title="Skip"
                  variant="outline"
                  size="md"
                  onPress={onSkip}
                  style={styles.footerButton}
                />
                <Button
                  title="Save & Continue"
                  variant="primary"
                  size="md"
                  onPress={handleSave}
                  style={styles.footerButton}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {
    ...typography['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  message: {
    ...typography.base,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.base,
    flex: 1,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 200,
    backgroundColor: colors.card,
  },
  charCount: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
    minHeight: touchTargets.comfortable,
  },
});
