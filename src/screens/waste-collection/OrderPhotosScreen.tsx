import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Image,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import {
  launchCamera,
  ImagePickerResponse,
  CameraOptions,
} from 'react-native-image-picker';
import {Button} from '../../components/Button';
import {Icon} from '../../components/Icon';
import {Input} from '../../components/Input';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {OrderData, FlowStep} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {
  photoService,
  OrderPhoto,
  PhotoCategory,
  PhotoCategoryDefinition,
  PhotoDocumentGroupWithPhotos,
  PHOTO_CATEGORY_DEFINITIONS,
  isShippingDocumentCategory,
} from '../../services/photoService';
import {colors, spacing, typography, borderRadius, touchTargets} from '../../styles/theme';
import {isLandscape} from '../../utils/responsive';
import {styles} from './styles';

type PhotoFilter = 'all' | PhotoCategory;

export interface OrderPhotosScreenProps {
  selectedOrderData: OrderData | null;
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  setCurrentStep: (step: FlowStep) => void;
  elapsedTimeDisplay: string;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  handleRequestPause: () => void;
  handleResumeTracking: () => void;
  setShowJobNotesModal: (show: boolean) => void;
  validationState: {state: 'none' | 'warning' | 'error'; count: number};
  setShowValidationModal: (show: boolean) => void;
  setShowServiceCenterModal: (show: boolean) => void;
  selectedTruck: {number: string; description?: string} | null;
  truckId: string;
  selectedTrailer: {number: string; description?: string} | null;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  handleManualSync: () => void;
  serviceTypeBadgesForHeader: Array<{
    serviceTypeId: string;
    srNumber?: string;
    status: 'pending' | 'in-progress' | 'noship' | 'completed';
  }>;
  isOrderCompleted: (orderNumber: string) => boolean;
  onBack: () => void;
  inManifestCompletion?: boolean;
}

export const OrderPhotosScreen: React.FC<OrderPhotosScreenProps> = ({
  selectedOrderData,
  isOrderHeaderCollapsed,
  setIsOrderHeaderCollapsed,
  elapsedTimeDisplay,
  currentOrderTimeTracking,
  handleRequestPause,
  handleResumeTracking,
  setShowJobNotesModal,
  validationState,
  setShowValidationModal,
  setShowServiceCenterModal,
  selectedTruck,
  truckId,
  selectedTrailer,
  syncStatus,
  pendingSyncCount,
  handleManualSync,
  serviceTypeBadgesForHeader,
  isOrderCompleted,
  onBack,
  inManifestCompletion = false,
}) => {
  const {width: windowWidth} = useWindowDimensions();
  const gridColumns = isLandscape() ? 3 : 2;

  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingPhotoCategory, setPendingPhotoCategory] =
    useState<PhotoCategory | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [viewerEditingNote, setViewerEditingNote] = useState(false);
  const [viewerNoteText, setViewerNoteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [addPagePrompt, setAddPagePrompt] = useState<{
    groupId: string;
    category: PhotoCategory;
  } | null>(null);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const orderNumber = selectedOrderData?.orderNumber ?? '';
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  useEffect(() => {
    if (!orderNumber) {
      setPhotos([]);
      return;
    }
    return photoService.onPhotosChange(orderNumber, setPhotos);
  }, [orderNumber]);

  const photosByCategory = useMemo(() => {
    const grouped = new Map<PhotoCategory, OrderPhoto[]>();
    PHOTO_CATEGORY_DEFINITIONS.forEach(({category}) =>
      grouped.set(category, []),
    );
    photos.forEach(photo => {
      const list = grouped.get(photo.category) ?? [];
      list.push(photo);
      grouped.set(photo.category, list);
    });
    return grouped;
  }, [photos]);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => b.capturedAt - a.capturedAt),
    [photos],
  );

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'all') return sortedPhotos;
    if (isShippingDocumentCategory(activeFilter)) {
      const groups = photoService.getDocumentGroupsForOrder(
        orderNumber,
        activeFilter,
      );
      const ordered: OrderPhoto[] = [];
      groups.forEach(group => {
        ordered.push(...photoService.getPhotosInGroup(orderNumber, group.id));
      });
      return ordered;
    }
    return sortedPhotos.filter(p => p.category === activeFilter);
  }, [sortedPhotos, activeFilter, orderNumber, photos]);

  const isShippingFilter =
    activeFilter !== 'all' && isShippingDocumentCategory(activeFilter);

  const shippingDocumentGroups = useMemo((): PhotoDocumentGroupWithPhotos[] => {
    if (!isShippingFilter) return [];
    return photoService
      .getDocumentGroupsForOrder(orderNumber, activeFilter)
      .map(group =>
        photoService.getDocumentGroupWithPhotos(orderNumber, group.id),
      )
      .filter((group): group is PhotoDocumentGroupWithPhotos => group != null);
  }, [photos, activeFilter, orderNumber, isShippingFilter]);

  const activeFilterMeta =
    activeFilter !== 'all'
      ? PHOTO_CATEGORY_DEFINITIONS.find(d => d.category === activeFilter) ??
        null
      : null;

  const gridGap = spacing.sm;
  const gridHorizontalPadding = spacing.lg;
  const thumbnailSize =
    (windowWidth - gridHorizontalPadding * 2 - gridGap * (gridColumns - 1)) /
    gridColumns;

  const getCategoryCount = (category: PhotoCategory) =>
    photosByCategory.get(category)?.length ?? 0;

  const isCategoryOutstanding = (definition: PhotoCategoryDefinition) => {
    if (getCategoryCount(definition.category) > 0) return false;
    if (definition.requirement === 'start') return true;
    if (definition.requirement === 'closeout') return inManifestCompletion;
    return false;
  };

  const openCamera = useCallback(
    (presetCategory: PhotoCategory, groupId?: string) => {
      if (!photoService.canAddPhotoToCategory(orderNumber, presetCategory)) {
        const max = photoService.getMaxPhotosForCategory(presetCategory);
        const label = photoService.getCategoryLabel(presetCategory);
        Alert.alert(
          'Photo limit reached',
          `Maximum of ${max} ${label} photo${max !== 1 ? 's' : ''} allowed for this order.`,
        );
        return;
      }

      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
        saveToPhotos: false,
      };

      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to capture photo');
          return;
        }

        const uri = response.assets?.[0]?.uri;
        if (!uri) return;

        setPendingPhotoUri(uri);
        setPendingPhotoCategory(presetCategory);
        setPendingGroupId(groupId ?? null);
        setPhotoCaption('');
        setShowCaptionModal(true);
      });
    },
    [orderNumber],
  );

  const resetPendingPhoto = () => {
    setPendingPhotoUri(null);
    setPendingPhotoCategory(null);
    setPendingGroupId(null);
    setPhotoCaption('');
    setShowCaptionModal(false);
  };

  const handleSavePhoto = async () => {
    if (!pendingPhotoUri || !pendingPhotoCategory || !orderNumber) return;

    try {
      const caption = photoCaption.trim() || undefined;
      const saved = await photoService.addPhoto(
        orderNumber,
        pendingPhotoUri,
        pendingPhotoCategory,
        caption,
        pendingGroupId ?? undefined,
      );
      setActiveFilter(pendingPhotoCategory);
      resetPendingPhoto();

      if (
        isShippingDocumentCategory(pendingPhotoCategory) &&
        saved.groupId
      ) {
        setAddPagePrompt({
          groupId: saved.groupId,
          category: pendingPhotoCategory,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save photo';
      Alert.alert('Error', message);
    }
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerEditingNote(false);
    setShowDeleteConfirm(false);
  };

  const closeViewer = () => {
    setViewerIndex(null);
    setViewerEditingNote(false);
    setViewerNoteText('');
    setShowDeleteConfirm(false);
  };

  const viewerPhoto =
    viewerIndex != null ? filteredPhotos[viewerIndex] ?? null : null;

  useEffect(() => {
    if (viewerPhoto) {
      setViewerNoteText(viewerPhoto.caption ?? '');
    }
  }, [viewerPhoto?.id]);

  const goToViewerIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= filteredPhotos.length) return;
    setViewerIndex(nextIndex);
    setViewerEditingNote(false);
    setShowDeleteConfirm(false);
  };

  const handleDeleteViewerPhoto = async () => {
    if (!viewerPhoto) return;
    const deletedIndex = viewerIndex ?? 0;
    await photoService.deletePhoto(orderNumber, viewerPhoto.id);
    setShowDeleteConfirm(false);
    if (filteredPhotos.length <= 1) {
      closeViewer();
      return;
    }
    setViewerIndex(Math.max(0, Math.min(deletedIndex, filteredPhotos.length - 2)));
  };

  const handleSaveViewerNote = () => {
    if (!viewerPhoto) return;
    photoService.updatePhoto(orderNumber, viewerPhoto.id, {
      caption: viewerNoteText.trim() || undefined,
    });
    setViewerEditingNote(false);
  };

  const openEditGroupTitle = (group: PhotoDocumentGroupWithPhotos) => {
    const currentLabel =
      group.label ?? photoService.getCategoryLabel(group.category);
    setEditingGroup({id: group.id, label: currentLabel});
  };

  const handleSaveGroupTitle = async () => {
    if (!editingGroup || !orderNumber) return;
    try {
      await photoService.updateDocumentGroup(orderNumber, editingGroup.id, {
        label: editingGroup.label,
      });
      setEditingGroup(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update title';
      Alert.alert('Error', message);
    }
  };

  if (!selectedOrderData) return null;

  const isCategoryAtMax = (definition: PhotoCategoryDefinition) => {
    const max = definition.maxPhotos;
    if (max == null) return false;
    return getCategoryCount(definition.category) >= max;
  };

  const renderFilterChips = () => (
    <View style={localStyles.chipSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={localStyles.chipRow}
        style={localStyles.chipScroll}>
        <TouchableOpacity
          style={[
            localStyles.chip,
            activeFilter === 'all' && localStyles.chipActive,
          ]}
          onPress={() => setActiveFilter('all')}
          activeOpacity={0.7}>
          <Text
            style={[
              localStyles.chipText,
              activeFilter === 'all' && localStyles.chipTextActive,
            ]}>
            All ({photos.length})
          </Text>
        </TouchableOpacity>
        {PHOTO_CATEGORY_DEFINITIONS.map(definition => {
          const {category, label} = definition;
          const count = getCategoryCount(category);
          const isActive = activeFilter === category;
          const outstanding = isCategoryOutstanding(definition);
          const atMax = isCategoryAtMax(definition);
          return (
            <TouchableOpacity
              key={category}
              style={[
                localStyles.chip,
                isActive && localStyles.chipActive,
                outstanding && !isActive && localStyles.chipRequired,
                atMax && !isActive && localStyles.chipComplete,
              ]}
              onPress={() => setActiveFilter(category)}
              activeOpacity={0.7}>
              <Text
                style={[
                  localStyles.chipText,
                  isActive && localStyles.chipTextActive,
                ]}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const getPhotoBadgeLabel = (photo: OrderPhoto) => {
    const label = photoService.getCategoryLabel(photo.category);
    if (photo.groupId && photo.pageIndex != null) {
      return `${label} · p${photo.pageIndex}`;
    }
    return label;
  };

  const getViewerTitle = (photo: OrderPhoto) => {
    if (photo.groupId && photo.pageIndex != null) {
      const groupLabel = photoService.getDocumentGroupDisplayLabel(
        orderNumber,
        photo.groupId,
      );
      const groupPages = photoService.getPhotosInGroup(
        orderNumber,
        photo.groupId,
      );
      return `${groupLabel} · Page ${photo.pageIndex} of ${groupPages.length}`;
    }
    return photoService.getCategoryLabel(photo.category);
  };

  const renderThumbnail = (photo: OrderPhoto, index: number) => (
    <TouchableOpacity
      key={photo.id}
      style={[localStyles.thumbnailCell, {width: thumbnailSize}]}
      onPress={() => openViewer(index)}
      activeOpacity={0.8}>
      <Image
        source={{uri: photo.uri}}
        style={[localStyles.thumbnailImage, {height: thumbnailSize}]}
        resizeMode="cover"
      />
      <View style={localStyles.thumbnailBadge}>
        <Text style={localStyles.thumbnailBadgeText} numberOfLines={1}>
          {getPhotoBadgeLabel(photo)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const pageThumbSize = 88;

  const renderDocumentCard = (group: PhotoDocumentGroupWithPhotos) => {
    const label = photoService.getDocumentGroupDisplayLabel(
      orderNumber,
      group.id,
    );
    return (
      <View key={group.id} style={localStyles.documentCard}>
        <View style={localStyles.documentCardHeader}>
          <View style={localStyles.documentCardTitleRow}>
            <Text style={localStyles.documentCardTitle}>{label}</Text>
            {!isCurrentOrderCompleted && (
              <TouchableOpacity
                onPress={() => openEditGroupTitle(group)}
                style={localStyles.documentCardEditButton}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                activeOpacity={0.7}>
                <Icon name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={localStyles.documentCardMeta}>
            {group.photos.length} page{group.photos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.pageStrip}>
          {group.photos.map(photo => {
            const index = filteredPhotos.findIndex(p => p.id === photo.id);
            return (
              <TouchableOpacity
                key={photo.id}
                style={localStyles.pageThumb}
                onPress={() => openViewer(index)}
                activeOpacity={0.8}>
                <Image
                  source={{uri: photo.uri}}
                  style={[
                    localStyles.pageThumbImage,
                    {width: pageThumbSize, height: pageThumbSize},
                  ]}
                  resizeMode="cover"
                />
                <Text style={localStyles.pageThumbLabel}>
                  p{photo.pageIndex}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!isCurrentOrderCompleted && activeFilter !== 'all' && (
            <TouchableOpacity
              style={[
                localStyles.pageAddThumb,
                {width: pageThumbSize, height: pageThumbSize},
              ]}
              onPress={() => openCamera(activeFilter, group.id)}
              activeOpacity={0.7}>
              <Icon name="add-a-photo" size={28} color={colors.primary} />
              <Text style={localStyles.pageAddLabel}>Add page</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderDocumentCardList = () => (
    <View style={localStyles.documentList}>
      {shippingDocumentGroups.map(renderDocumentCard)}
      {!isCurrentOrderCompleted && activeFilterMeta && (
        <Button
          title={`Capture new ${activeFilterMeta.label}`}
          variant="outline"
          size="md"
          onPress={() => openCamera(activeFilter as PhotoCategory)}
          style={localStyles.newDocumentButton}
        />
      )}
    </View>
  );

  const renderAddTile = () => {
    if (isCurrentOrderCompleted || activeFilter === 'all') return null;
    if (!activeFilterMeta) return null;
    if (isCategoryAtMax(activeFilterMeta)) return null;
    return (
      <TouchableOpacity
        style={[
          localStyles.addTile,
          {width: thumbnailSize, height: thumbnailSize},
        ]}
        onPress={() => openCamera(activeFilter)}
        activeOpacity={0.7}>
        <Icon name="add-a-photo" size={36} color={colors.primary} />
        <Text style={localStyles.addTileText}>Add photo</Text>
      </TouchableOpacity>
    );
  };

  const renderPhotoGrid = () => (
    <View style={localStyles.gridContainer}>
      {filteredPhotos.map((photo, index) => renderThumbnail(photo, index))}
      {renderAddTile()}
    </View>
  );

  return (
    <View style={styles.container}>
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() =>
          setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)
        }
        onBackPress={onBack}
        subtitle="Photos"
        elapsedTimeDisplay={
          elapsedTimeDisplay && currentOrderTimeTracking && selectedOrderData
            ? elapsedTimeDisplay
            : undefined
        }
        isPaused={Boolean(currentOrderTimeTracking?.pausedAt)}
        onPause={handleRequestPause}
        onResume={handleResumeTracking}
        onViewNotes={() => setShowJobNotesModal(true)}
        validationState={validationState}
        onViewValidation={() => setShowValidationModal(true)}
        onViewServiceCenter={() => setShowServiceCenterModal(true)}
        truckNumber={selectedTruck?.number || truckId || undefined}
        trailerNumber={selectedTrailer?.number || null}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        onSync={handleManualSync}
        serviceTypeBadges={serviceTypeBadgesForHeader}
      />

      <View style={styles.scrollViewContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            localStyles.scrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}>
          {renderFilterChips()}

          {isShippingFilter ? (
            shippingDocumentGroups.length === 0 ? (
              <View style={styles.emptyMaterialsState}>
                <Icon
                  name="photo-library"
                  size={48}
                  color={colors.mutedForeground}
                />
                <Text style={styles.emptyMaterialsText}>
                  {`No ${activeFilterMeta?.label ?? 'document'} photos yet`}
                </Text>
                {!isCurrentOrderCompleted && activeFilterMeta && (
                  <Button
                    title={`Capture ${activeFilterMeta.label}`}
                    variant="primary"
                    size="md"
                    onPress={() => openCamera(activeFilter)}
                    style={localStyles.emptyCaptureButton}
                  />
                )}
              </View>
            ) : (
              renderDocumentCardList()
            )
          ) : filteredPhotos.length === 0 ? (
            <View style={styles.emptyMaterialsState}>
              <Icon name="photo-library" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyMaterialsText}>
                {photos.length === 0
                  ? 'No photos yet'
                  : `No ${activeFilterMeta?.label ?? 'matching'} photos`}
              </Text>
              {activeFilter !== 'all' &&
                !isCurrentOrderCompleted &&
                activeFilterMeta &&
                !isCategoryAtMax(activeFilterMeta) && (
                <Button
                  title={`Capture ${activeFilterMeta.label}`}
                  variant="primary"
                  size="md"
                  onPress={() => openCamera(activeFilter)}
                  style={localStyles.emptyCaptureButton}
                />
              )}
            </View>
          ) : (
            renderPhotoGrid()
          )}
        </ScrollView>
      </View>

      <Modal
        visible={viewerPhoto != null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeViewer}>
        <SafeAreaView style={localStyles.viewerContainer}>
          <View style={localStyles.viewerHeader}>
            <TouchableOpacity
              onPress={closeViewer}
              style={localStyles.viewerHeaderButton}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
              <Icon name="close" size={28} color={colors.foreground} />
            </TouchableOpacity>
            {viewerPhoto && (
              <View style={localStyles.viewerHeaderCenter}>
                <Text style={localStyles.viewerCategory}>
                  {getViewerTitle(viewerPhoto)}
                </Text>
                <Text style={localStyles.viewerTimestamp}>
                  {new Date(viewerPhoto.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
            <Text style={localStyles.viewerCounter}>
              {viewerIndex != null
                ? `${viewerIndex + 1} / ${filteredPhotos.length}`
                : ''}
            </Text>
          </View>

          {viewerPhoto && (
            <>
              <View style={localStyles.viewerImageWrap}>
                <TouchableOpacity
                  style={localStyles.viewerNavButton}
                  onPress={() => goToViewerIndex((viewerIndex ?? 0) - 1)}
                  disabled={(viewerIndex ?? 0) <= 0}>
                  <Icon
                    name="chevron-left"
                    size={36}
                    color={
                      (viewerIndex ?? 0) <= 0
                        ? colors.mutedForeground
                        : colors.foreground
                    }
                  />
                </TouchableOpacity>
                <Image
                  source={{uri: viewerPhoto.uri}}
                  style={localStyles.viewerImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={localStyles.viewerNavButton}
                  onPress={() => goToViewerIndex((viewerIndex ?? 0) + 1)}
                  disabled={(viewerIndex ?? 0) >= filteredPhotos.length - 1}>
                  <Icon
                    name="chevron-right"
                    size={36}
                    color={
                      (viewerIndex ?? 0) >= filteredPhotos.length - 1
                        ? colors.mutedForeground
                        : colors.foreground
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={localStyles.viewerDetails}>
                {viewerEditingNote ? (
                  <View style={localStyles.viewerNoteEdit}>
                    <Input
                      label="Note"
                      placeholder="Add a note (optional)"
                      value={viewerNoteText}
                      onChangeText={setViewerNoteText}
                      multiline
                      numberOfLines={2}
                    />
                    <View style={localStyles.viewerNoteActions}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        size="md"
                        onPress={() => {
                          setViewerEditingNote(false);
                          setViewerNoteText(viewerPhoto.caption ?? '');
                        }}
                      />
                      <Button
                        title="Save"
                        variant="primary"
                        size="md"
                        onPress={handleSaveViewerNote}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={localStyles.viewerCaption}>
                    {viewerPhoto.caption?.trim()
                      ? viewerPhoto.caption
                      : 'No note'}
                  </Text>
                )}
              </View>

              {!isCurrentOrderCompleted && (
                <View style={localStyles.viewerActions}>
                  <TouchableOpacity
                    style={localStyles.viewerActionButton}
                    onPress={() => setViewerEditingNote(true)}
                    activeOpacity={0.7}>
                    <Icon name="edit" size={28} color={colors.primary} />
                    <Text style={localStyles.viewerActionLabel}>Edit note</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.viewerActionButton}
                    onPress={() => setShowDeleteConfirm(true)}
                    activeOpacity={0.7}>
                    <Icon name="delete" size={28} color={colors.destructive} />
                    <Text
                      style={[
                        localStyles.viewerActionLabel,
                        {color: colors.destructive},
                      ]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {showDeleteConfirm && (
            <View style={localStyles.viewerConfirmOverlay}>
              <View style={localStyles.viewerConfirmBox}>
                <Text style={localStyles.viewerConfirmTitle}>
                  Delete this photo?
                </Text>
                <View style={localStyles.viewerNoteActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="md"
                    onPress={() => setShowDeleteConfirm(false)}
                  />
                  <Button
                    title="Delete"
                    variant="destructive"
                    size="md"
                    onPress={handleDeleteViewerPhoto}
                  />
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={editingGroup != null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingGroup(null)}>
        <View style={localStyles.captionModalOverlay}>
          <View style={localStyles.captionModalContainer}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Document title</Text>
              <TouchableOpacity
                onPress={() => setEditingGroup(null)}
                style={localStyles.modalCloseButton}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={localStyles.captionModalContent}>
              <Input
                label="Title"
                placeholder="Enter a title for this document"
                value={editingGroup?.label ?? ''}
                onChangeText={text =>
                  setEditingGroup(prev =>
                    prev ? {...prev, label: text} : prev,
                  )
                }
                autoFocus
              />
              <Button
                title="Save"
                variant="primary"
                size="lg"
                onPress={handleSaveGroupTitle}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addPagePrompt != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddPagePrompt(null)}>
        <View style={localStyles.captionModalOverlay}>
          <View style={localStyles.addPagePromptBox}>
            <Text style={localStyles.addPagePromptTitle}>
              Add another page?
            </Text>
            <Text style={localStyles.addPagePromptMessage}>
              {addPagePrompt
                ? `You can capture additional pages for this ${photoService.getCategoryLabel(addPagePrompt.category)}.`
                : ''}
            </Text>
            <View style={localStyles.addPagePromptActions}>
              <Button
                title="Done"
                variant="outline"
                size="md"
                onPress={() => setAddPagePrompt(null)}
              />
              <Button
                title="Add page"
                variant="primary"
                size="md"
                onPress={() => {
                  if (!addPagePrompt) return;
                  const {groupId, category} = addPagePrompt;
                  setAddPagePrompt(null);
                  openCamera(category, groupId);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCaptionModal}
        transparent
        animationType="slide"
        onRequestClose={resetPendingPhoto}>
        <View style={localStyles.captionModalOverlay}>
          <View style={localStyles.captionModalContainer}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>
                {pendingGroupId && pendingPhotoCategory
                  ? `Add ${photoService.getCategoryLabel(pendingPhotoCategory)} page`
                  : 'Add Note'}
              </Text>
              <TouchableOpacity
                onPress={resetPendingPhoto}
                style={localStyles.modalCloseButton}>
                <Icon name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={localStyles.captionModalContent}>
              <Input
                label="Note"
                placeholder="Add a note about this photo (optional)"
                value={photoCaption}
                onChangeText={setPhotoCaption}
                multiline
                numberOfLines={3}
              />
              <Button
                title="Save"
                variant="primary"
                size="lg"
                onPress={handleSavePhoto}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.md,
  },
  chipSection: {
    marginBottom: spacing.md,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: touchTargets.min,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipRequired: {
    borderColor: colors.warning,
    backgroundColor: '#fffbeb',
  },
  chipComplete: {
    borderColor: colors.success,
  },
  chipText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  chipTextActive: {
    color: colors.primaryForeground,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailCell: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  thumbnailImage: {
    width: '100%',
    borderRadius: borderRadius.md,
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  thumbnailBadgeText: {
    ...typography.xs,
    color: '#fff',
    fontWeight: '600',
  },
  addTile: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addTileText: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCaptureButton: {
    marginTop: spacing.md,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    minHeight: touchTargets.comfortable,
  },
  viewerHeaderButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  viewerCategory: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
  },
  viewerTimestamp: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  viewerCounter: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
    minWidth: 48,
    textAlign: 'right',
  },
  viewerImageWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  viewerNavButton: {
    width: touchTargets.large,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    flex: 1,
    height: '100%',
  },
  viewerDetails: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewerCaption: {
    ...typography.base,
    color: colors.foreground,
  },
  viewerNoteEdit: {
    gap: spacing.sm,
  },
  viewerNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  viewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewerActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTargets.xlarge,
    minHeight: touchTargets.comfortable,
    gap: spacing.xs,
  },
  viewerActionLabel: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  viewerConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  viewerConfirmBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  viewerConfirmTitle: {
    ...typography.lg,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryList: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pickerGroup: {
    gap: spacing.sm,
  },
  pickerGroupTitle: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTargets.comfortable,
  },
  categoryItemText: {
    flex: 1,
    gap: 2,
  },
  categoryItemLabel: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  categoryItemDescription: {
    ...typography.sm,
    color: colors.mutedForeground,
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
  captionModalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  documentList: {
    gap: spacing.md,
  },
  documentCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  documentCardHeader: {
    gap: 2,
  },
  documentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  documentCardTitle: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  documentCardEditButton: {
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCardMeta: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  pageStrip: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pageThumb: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  pageThumbImage: {
    borderRadius: borderRadius.md,
  },
  pageThumbLabel: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  pageAddThumb: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pageAddLabel: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  newDocumentButton: {
    marginTop: spacing.xs,
  },
  addPagePromptBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  addPagePromptTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  addPagePromptMessage: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  addPagePromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
