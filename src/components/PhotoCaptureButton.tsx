import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import {Icon} from './Icon';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {Input} from './Input';
import {photoService, PhotoCategory} from '../services/photoService';
import {launchCamera, ImagePickerResponse, CameraOptions} from 'react-native-image-picker';

interface PhotoCaptureButtonProps {
  orderNumber: string;
  onPhotoAdded?: () => void;
  onViewPhotos?: () => void;
  onScanDocument?: () => void;
  style?: any;
  /** Icon color for the main button (e.g. when used in footer nav). Defaults to theme foreground. */
  iconColor?: string;
}

export const PhotoCaptureButton: React.FC<PhotoCaptureButtonProps> = ({
  orderNumber,
  onPhotoAdded,
  onViewPhotos,
  onScanDocument,
  style,
  iconColor = colors.foreground,
}) => {
  const [photoCount, setPhotoCount] = useState(0);
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingPhotoCategory, setPendingPhotoCategory] = useState<PhotoCategory | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load initial photo count
    setPhotoCount(photoService.getPhotoCount(orderNumber));

    // Subscribe to photo changes
    const unsubscribe = photoService.onPhotosChange(orderNumber, (photos) => {
      setPhotoCount(photos.length);
    });

    return unsubscribe;
  }, [orderNumber]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  const openCamera = useCallback(() => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: false,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert('Error', 'Failed to capture photo');
        return;
      }

      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setPendingPhotoUri(uri);
        setShowCategorySelector(true);
      }
    });
  }, []);

  const handlePress = useCallback(() => {
    // Single tap - open camera
    openCamera();
  }, [openCamera]);

  const handleLongPress = useCallback(() => {
    // Long press - show quick actions menu
    setShowQuickActionsMenu(true);
  }, []);

  const handlePressIn = useCallback(() => {
    // Start long press timer
    const timer = setTimeout(() => {
      handleLongPress();
    }, 500); // 500ms for long press
    longPressTimerRef.current = timer;
  }, [handleLongPress]);

  const handlePressOut = useCallback(() => {
    // Cancel long press timer if released early
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleCategorySelect = (category: PhotoCategory) => {
    if (!pendingPhotoUri) return;
    setPendingPhotoCategory(category);
    setPhotoCaption('');
    setShowCategorySelector(false);
    setShowCaptionModal(true);
  };

  const resetPendingPhoto = useCallback(() => {
    setPendingPhotoUri(null);
    setPendingPhotoCategory(null);
    setPhotoCaption('');
    setShowCaptionModal(false);
  }, []);

  const handleSavePhoto = useCallback(async () => {
    if (!pendingPhotoUri || !pendingPhotoCategory) return;

    try {
      const caption = photoCaption.trim() || undefined;
      await photoService.addPhoto(orderNumber, pendingPhotoUri, pendingPhotoCategory, caption);
      onPhotoAdded?.();
      Alert.alert('Success', 'Photo captured successfully');
      resetPendingPhoto();
    } catch (error) {
      Alert.alert('Error', 'Failed to save photo');
    }
  }, [pendingPhotoUri, pendingPhotoCategory, photoCaption, orderNumber, onPhotoAdded, resetPendingPhoto]);

  const photoCategories: {category: PhotoCategory; label: string; icon: string}[] = [
    {category: 'waste-item', label: 'Waste Item', icon: 'inventory'},
    {category: 'site-condition', label: 'Site Condition', icon: 'home'},
    {category: 'safety-issue', label: 'Safety Issue', icon: 'warning'},
    {category: 'equipment', label: 'Equipment', icon: 'security'},
    {category: 'customer-document', label: 'Customer Document', icon: 'description'},
    {category: 'other', label: 'Other', icon: 'folder'},
  ];

  return (
    <>
      <TouchableOpacity
        style={style}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}>
        <View style={styles.buttonContent}>
          <Icon name="camera-alt" size={24} color={iconColor} />
          <Text style={styles.buttonLabel}>Photos</Text>
          {photoCount > 0 && (
            <View style={styles.buttonBadge}>
              <Text style={styles.buttonBadgeText}>{photoCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Quick Actions Menu */}
      <Modal
        visible={showQuickActionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActionsMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActionsMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowQuickActionsMenu(false);
                openCamera();
              }}
              activeOpacity={0.7}>
              <Icon name="camera-alt" size={24} color={colors.foreground} />
              <Text style={styles.menuItemText}>Take Photo</Text>
            </TouchableOpacity>

            {onViewPhotos && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowQuickActionsMenu(false);
                  onViewPhotos();
                }}
                activeOpacity={0.7}>
                <Icon name="folder" size={24} color={colors.foreground} />
                <Text style={styles.menuItemText}>View Order Photos</Text>
                {photoCount > 0 && (
                  <View style={styles.menuItemBadge}>
                    <Text style={styles.menuItemBadgeText}>{photoCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {onScanDocument && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowQuickActionsMenu(false);
                  onScanDocument();
                }}
                activeOpacity={0.7}>
                <Icon name="description" size={24} color={colors.foreground} />
                <Text style={styles.menuItemText}>Scan Document</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Selector Modal */}
      <Modal
        visible={showCategorySelector}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCategorySelector(false);
          setPendingPhotoUri(null);
          setPendingPhotoCategory(null);
        }}>
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModalContainer}>
            <View style={styles.categoryModalHeader}>
              <Text style={styles.categoryModalTitle}>Select Photo Category</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCategorySelector(false);
                  setPendingPhotoUri(null);
                  setPendingPhotoCategory(null);
                }}
                style={styles.categoryModalCloseButton}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryList}>
              {photoCategories.map(({category, label, icon}) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => handleCategorySelect(category)}
                  activeOpacity={0.7}>
                  <View style={styles.categoryIconContainer}>
                    <Icon name={icon} size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.categoryLabel}>{label}</Text>
                  <Icon name="arrow-forward" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Caption Modal */}
      <Modal
        visible={showCaptionModal}
        transparent
        animationType="slide"
        onRequestClose={resetPendingPhoto}>
        <View style={styles.captionModalOverlay}>
          <View style={styles.captionModalContainer}>
            <View style={styles.captionModalHeader}>
              <Text style={styles.captionModalTitle}>Add Photo Comment</Text>
              <TouchableOpacity
                onPress={resetPendingPhoto}
                style={styles.captionModalCloseButton}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.captionModalContent}>
              <Input
                label="Comment"
                placeholder="Add a note about this photo (optional)"
                value={photoCaption}
                onChangeText={setPhotoCaption}
                multiline
                numberOfLines={3}
              />
              <View style={styles.captionModalActions}>
                <TouchableOpacity
                  style={styles.captionModalSaveButton}
                  onPress={handleSavePhoto}
                  activeOpacity={0.7}>
                  <Text style={styles.captionModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  buttonLabel: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  buttonBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    zIndex: 1,
  },
  buttonBadgeText: {
    ...typography.base,
    fontWeight: '700',
    color: colors.primaryForeground,
    fontSize: 12,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  menuItemText: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    flex: 1,
  },
  menuItemBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemBadgeText: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryModalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  categoryModalCloseButton: {
    padding: spacing.xs,
  },
  categoryList: {
    padding: spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    ...typography.base,
    fontWeight: '500',
    color: colors.foreground,
    flex: 1,
  },
  captionModalOverlay: {
    flex: 1,
    backgroundColor: colors.background + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  captionModalContainer: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  captionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  captionModalTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  captionModalCloseButton: {
    padding: spacing.xs,
  },
  captionModalContent: {
    padding: spacing.lg,
  },
  captionModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  captionModalSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  captionModalSaveText: {
    ...typography.base,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
});
