import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import {AddedContainer, OrderData} from '../../types/wasteCollection';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  touchTargets,
} from '../../styles/theme';
import {Button} from '../../components/Button';
import {Icon} from '../../components/Icon';
import {ContainerDeleteDetails} from './ContainerDeleteDetails';
import {styles} from './styles';

export interface DeleteContainerConfirmModalProps {
  visible: boolean;
  container: AddedContainer | null;
  orderData: OrderData | null;
  containerNumber?: number;
  barcodeInput: string;
  onBarcodeChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteContainerConfirmModal: React.FC<
  DeleteContainerConfirmModalProps
> = ({
  visible,
  container,
  orderData,
  containerNumber,
  barcodeInput,
  onBarcodeChange,
  onCancel,
  onConfirm,
}) => {
  const expectedBarcode = (
    container?.shippingLabelBarcode ||
    container?.barcode ||
    ''
  ).trim();
  const isBarcodeMatch =
    expectedBarcode.length > 0 && barcodeInput.trim() === expectedBarcode;
  const canScan = expectedBarcode.length > 0;

  const handleScanPress = () => {
    onBarcodeChange(expectedBarcode);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.bottomSheetOverlay}
        activeOpacity={1}
        onPress={onCancel}>
        <TouchableOpacity
          style={styles.bottomSheetContent}
          activeOpacity={1}
          onPress={e => e.stopPropagation()}>
          <View style={styles.bottomSheetHandle} />

          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Delete Container</Text>
          </View>

          <View style={styles.bottomSheetBody}>
            <Text style={styles.bottomSheetMessage}>
              Are you sure you want to delete this container? This action
              cannot be undone.
            </Text>
            {container ? (
              <ContainerDeleteDetails
                container={container}
                orderData={orderData}
                containerNumber={containerNumber}
              />
            ) : null}
            <Text style={localStyles.confirmInstructions}>
              To confirm, enter the container's shipping label:
            </Text>
            <View style={localStyles.barcodeInputWrapper}>
              <TextInput
                style={[
                  localStyles.barcodeInput,
                  canScan && localStyles.barcodeInputWithScan,
                ]}
                value={barcodeInput}
                onChangeText={onBarcodeChange}
                placeholder="Enter shipping label"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={canScan}
              />
              {canScan ? (
                <TouchableOpacity
                  onPress={handleScanPress}
                  style={localStyles.scanButton}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  accessibilityRole="button"
                  accessibilityLabel="Scan shipping label barcode">
                  <Icon
                    name="qr-code-scanner"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.bottomSheetFooter}>
            <Button
              title="Cancel"
              variant="outline"
              size="lg"
              onPress={onCancel}
              style={styles.bottomSheetCancelButton}
            />
            <Button
              title="Delete"
              variant="destructive"
              size="lg"
              disabled={!isBarcodeMatch}
              onPress={onConfirm}
              style={styles.bottomSheetDeleteButton}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const localStyles = StyleSheet.create({
  confirmInstructions: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  barcodeInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  barcodeInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    ...typography.base,
    color: colors.foreground,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  barcodeInputWithScan: {
    paddingRight: spacing.xl + spacing.sm,
  },
  scanButton: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: touchTargets.min,
  },
});
