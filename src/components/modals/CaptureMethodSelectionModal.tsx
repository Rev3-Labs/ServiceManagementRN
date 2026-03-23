import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Icon} from '../Icon';
import {colors} from '../../styles/theme';
import {styles} from '../../screens/WasteCollectionScreen';

export interface CaptureMethodSelectionModalProps {
  visible: boolean;
  onRequestClose: () => void;
  onSelectCaptureMethod: (method: 'camera' | 'gallery') => void;
  isManifestScanView?: boolean;
}

export const CaptureMethodSelectionModal: React.FC<CaptureMethodSelectionModalProps> = ({
  visible,
  onRequestClose,
  onSelectCaptureMethod,
  isManifestScanView = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}>
      <View style={styles.bottomSheetOverlay}>
        <TouchableOpacity
          style={{flex: 1}}
          activeOpacity={1}
          onPress={onRequestClose}
        />
        <View style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHandle} />
          
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>
              {isManifestScanView ? 'Scan manifest' : 'Capture Method'}
            </Text>
            <Text style={styles.bottomSheetSubtitle}>
              {isManifestScanView
                ? 'Capture the manifest document now'
                : 'Choose how to capture the document'}
            </Text>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.bottomSheetBodyContent}
            showsVerticalScrollIndicator={true}>
            {isManifestScanView ? (
              <TouchableOpacity
                style={styles.bottomSheetOptionButton}
                onPress={() => onSelectCaptureMethod('camera')}
                activeOpacity={0.7}>
                <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                  <Icon name="camera-alt" size={24} color={colors.foreground} />
                </View>
                <View style={styles.bottomSheetOptionInfo}>
                  <Text style={styles.bottomSheetOptionLabel}>Capture Now</Text>
                  <Text style={styles.bottomSheetOptionDesc}>
                    Use camera to capture the manifest
                  </Text>
                </View>
                <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => onSelectCaptureMethod('camera')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                    <Icon name="camera-alt" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Take Photo</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Use camera to capture the document
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomSheetOptionButton}
                  onPress={() => onSelectCaptureMethod('gallery')}
                  activeOpacity={0.7}>
                  <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                    <Icon name="folder" size={24} color={colors.foreground} />
                  </View>
                  <View style={styles.bottomSheetOptionInfo}>
                    <Text style={styles.bottomSheetOptionLabel}>Choose from Files</Text>
                    <Text style={styles.bottomSheetOptionDesc}>
                      Select an existing image file
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          <View style={styles.bottomSheetFooter}>
            <TouchableOpacity
              style={styles.bottomSheetCancelButton}
              onPress={onRequestClose}>
              <Text style={styles.bottomSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
