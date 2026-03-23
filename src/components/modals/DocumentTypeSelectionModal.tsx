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

export interface DocumentTypeSelectionModalProps {
  visible: boolean;
  onRequestClose: () => void;
  onSelectDocumentType: (documentType: 'manifest' | 'ldr' | 'bol') => void;
}

export const DocumentTypeSelectionModal: React.FC<DocumentTypeSelectionModalProps> = ({
  visible,
  onRequestClose,
  onSelectDocumentType,
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
          {/* Drag Handle */}
          <View style={styles.bottomSheetHandle} />
          
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Select Document Type</Text>
            <Text style={styles.bottomSheetSubtitle}>
              Choose the type of document you want to scan
            </Text>
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.bottomSheetBodyContent}
            showsVerticalScrollIndicator={true}>
            <TouchableOpacity
              style={styles.bottomSheetOptionButton}
              onPress={() => onSelectDocumentType('manifest')}
              activeOpacity={0.7}>
              <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#DBEAFE'}]}>
                <Icon name="assignment" size={24} color={colors.foreground} />
              </View>
              <View style={styles.bottomSheetOptionInfo}>
                <Text style={styles.bottomSheetOptionLabel}>Manifest</Text>
                <Text style={styles.bottomSheetOptionDesc}>
                  Hazardous waste manifest (EPA Form 8700-22)
                </Text>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetOptionButton}
              onPress={() => onSelectDocumentType('ldr')}
              activeOpacity={0.7}>
              <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#FEF3C7'}]}>
                <Icon name="description" size={24} color={colors.foreground} />
              </View>
              <View style={styles.bottomSheetOptionInfo}>
                <Text style={styles.bottomSheetOptionLabel}>LDR</Text>
                <Text style={styles.bottomSheetOptionDesc}>
                  Land Disposal Restrictions notification
                </Text>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetOptionButton}
              onPress={() => onSelectDocumentType('bol')}
              activeOpacity={0.7}>
              <View style={[styles.bottomSheetOptionIcon, {backgroundColor: '#D1FAE5'}]}>
                <Icon name="local-shipping" size={24} color={colors.foreground} />
              </View>
              <View style={styles.bottomSheetOptionInfo}>
                <Text style={styles.bottomSheetOptionLabel}>BOL</Text>
                <Text style={styles.bottomSheetOptionDesc}>
                  Bill of Lading for shipment
                </Text>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
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
