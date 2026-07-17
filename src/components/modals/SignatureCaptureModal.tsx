import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import {colors, spacing, typography, touchTargets} from '../../styles/theme';

export interface SignatureCaptureModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  /** Called with a data-URI (or base64) image string when the user saves. */
  onSave: (signatureDataUri: string) => void;
}

/**
 * Full-screen modal that captures a handwritten signature via canvas.
 * Native: `react-native-signature-canvas` (WebView).
 * Web: webpack aliases the same import to a real HTML canvas mock.
 */
export const SignatureCaptureModal: React.FC<SignatureCaptureModalProps> = ({
  visible,
  title = 'Capture Signature',
  onClose,
  onSave,
}) => {
  const [emptyError, setEmptyError] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEmptyError(false);
    }
  }, [visible]);

  const handleOK = (signature: string) => {
    setEmptyError(false);
    // Library / web mock may return raw base64 or a full data URI.
    const dataUri = signature.startsWith('data:')
      ? signature
      : `data:image/png;base64,${signature}`;
    onSave(dataUri);
    onClose();
  };

  const handleEmpty = () => {
    setEmptyError(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={Platform.OS === 'web'}
      onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          Platform.OS === 'web' && styles.containerWeb,
        ]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close signature capture">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {emptyError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Please draw a signature before saving.
            </Text>
          </View>
        ) : null}

        <View style={styles.canvasWrap}>
          {visible ? (
            <SignatureCanvas
              onOK={handleOK}
              onEmpty={handleEmpty}
              onClear={() => setEmptyError(false)}
              descriptionText="Sign above"
              clearText="Clear"
              confirmText="Save"
              autoClear={false}
              imageType="image/png"
              penColor="#111111"
              backgroundColor="#FFFFFF"
              webStyle={webStyle}
              style={styles.canvas}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const webStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: 1px solid #9ca3af;
    margin: 0;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
  }
  .m-signature-pad--footer .button {
    background-color: #65B230;
    color: #fff;
    font-size: 16px;
    padding: 10px 20px;
    border-radius: 6px;
  }
  .m-signature-pad--footer .button.clear {
    background-color: #dc2626;
  }
  body,html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerWeb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.xl,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
    paddingRight: spacing.md,
  },
  closeBtn: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    ...typography.xl,
    color: colors.foreground,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.sm,
    color: colors.destructive,
    fontWeight: '600',
  },
  canvasWrap: {
    flex: 1,
    margin: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: Platform.OS === 'web' ? 360 : undefined,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
