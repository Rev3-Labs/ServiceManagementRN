import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput} from 'react-native';
import {Input} from '../../components/Input';
import {Badge} from '../../components/Badge';
import {Icon} from '../../components/Icon';
import {PersistentOrderHeader} from '../../components/PersistentOrderHeader';
import {colors} from '../../styles/theme';
import {FlowStep, OrderData, WasteStream} from '../../types/wasteCollection';
import {SyncStatus} from '../../services/syncService';
import {TimeTrackingRecord} from '../../services/timeTrackingService';
import {OfflineStatus} from '../../services/offlineTrackingService';
import {styles} from './styles';

export interface StreamSelectionScreenProps {
  // Order state
  selectedOrderData: OrderData | null;
  setSelectedOrderData: (order: OrderData | null) => void;

  // Header props
  isOrderHeaderCollapsed: boolean;
  setIsOrderHeaderCollapsed: (collapsed: boolean) => void;
  setCurrentStep: (step: FlowStep) => void;
  elapsedTimeDisplay: string;
  currentOrderTimeTracking: TimeTrackingRecord | null;
  handleRequestPause: () => void;
  handleResumeTracking: () => void;
  setShowJobNotesModal: (show: boolean) => void;
  validationState?: {state: 'none' | 'warning' | 'error'; count: number};
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
    label: string;
    status: 'pending' | 'in-progress' | 'completed' | 'noship';
  }>;
  isOrderCompleted: (orderNumber: string) => boolean;

  // Offline
  offlineStatus: OfflineStatus;
  setShowOfflineBlockedModal: (show: boolean) => void;

  // Stream selection specific
  streamSearchQuery: string;
  setStreamSearchQuery: (query: string) => void;
  filteredStreams: WasteStream[];
  recentlyUsedProfiles: string[];
  setRecentlyUsedProfiles: (profiles: string[] | ((prev: string[]) => string[])) => void;
  setSelectedStream: (stream: string) => void;
  setSelectedStreamCode: (code: string) => void;
  setSelectedStreamId: (id: string) => void;
  setCylinderCount: (count: string) => void;
  searchInputRef: React.RefObject<TextInput>;
  handleSearchFocus: () => void;
  handleSearchBlur: () => void;
  handleSearchChange: (text: string) => void;
  wasteStreams: WasteStream[];
}

export const StreamSelectionScreen: React.FC<StreamSelectionScreenProps> = ({
  selectedOrderData,
  isOrderHeaderCollapsed,
  setIsOrderHeaderCollapsed,
  setCurrentStep,
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
  offlineStatus,
  setShowOfflineBlockedModal,
  streamSearchQuery,
  filteredStreams,
  recentlyUsedProfiles,
  setRecentlyUsedProfiles,
  setSelectedStream,
  setSelectedStreamCode,
  setSelectedStreamId,
  setCylinderCount,
  searchInputRef,
  handleSearchFocus,
  handleSearchBlur,
  handleSearchChange,
}) => {
  const isCurrentOrderCompleted = selectedOrderData
    ? isOrderCompleted(selectedOrderData.orderNumber)
    : false;

  if (!selectedOrderData) return null;

  // Get warning banner based on offline status
  const getWarningBanner = () => {
    if (offlineStatus.isOnline) return null;

    const {warningLevel, offlineDurationMs} = offlineStatus;
    if (warningLevel === 'blocked') return null; // Modal handles this

    let bannerStyle = styles.offlineWarningBanner;
    let bannerText = '';
    let remainingTime = '';
    let iconColor = colors.foreground;

    if (warningLevel === 'critical') {
      // Red critical banner at 9.5 hours
      bannerStyle = styles.offlineCriticalBanner;
      iconColor = colors.primaryForeground;
      const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
      const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
      if (remainingMinutes < 60) {
        remainingTime = `${remainingMinutes} min remaining`;
      } else {
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        remainingTime = `${remainingHours} hr ${remainingMins} min remaining`;
      }
      bannerText = `Critical: ${remainingTime} before offline limit`;
    } else if (warningLevel === 'orange') {
      // Orange warning banner at 9 hours
      bannerStyle = styles.offlineOrangeBanner;
      iconColor = '#FF6B35';
      const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMins = Math.floor(
        (remainingMs % (60 * 60 * 1000)) / (60 * 1000),
      );
      remainingTime = `${remainingHours} hr ${remainingMins} min remaining`;
      bannerText = `Warning: ${remainingTime} before offline limit`;
    } else if (warningLevel === 'warning') {
      // Yellow warning banner at 8 hours
      bannerStyle = styles.offlineWarningBanner;
      iconColor = colors.foreground;
      const remainingMs = 10 * 60 * 60 * 1000 - offlineDurationMs;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      remainingTime = `${remainingHours} hr${
        remainingHours !== 1 ? 's' : ''
      } remaining`;
      bannerText = `Warning: ${remainingTime} before offline limit`;
    }

    if (!bannerText) return null;

    return (
      <View style={bannerStyle}>
        <View style={styles.offlineWarningBannerRow}>
          <Icon name="warning" size={18} color={iconColor} />
          <Text style={styles.offlineWarningBannerText}>{bannerText}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {getWarningBanner()}
      <PersistentOrderHeader
        orderData={selectedOrderData}
        isCollapsed={isOrderHeaderCollapsed}
        onToggleCollapse={() =>
          setIsOrderHeaderCollapsed(!isOrderHeaderCollapsed)
        }
        onBackPress={() => setCurrentStep('dashboard')}
        subtitle={`${selectedOrderData.customer || 'Customer Name'} - ${
          selectedOrderData.site || 'Site Location'
        }`}
        elapsedTimeDisplay={
          elapsedTimeDisplay &&
          currentOrderTimeTracking &&
          selectedOrderData
            ? elapsedTimeDisplay
            : undefined
        }
        isPaused={Boolean(currentOrderTimeTracking?.pausedAt)}
        onPause={handleRequestPause}
        onResume={handleResumeTracking}
        onViewNotes={() => {
          setShowJobNotesModal(true);
        }}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}>
        <Input
          ref={searchInputRef}
          placeholder="Search waste streams..."
          value={streamSearchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          containerStyle={styles.searchInput}
        />

        {filteredStreams.length > 0 ? (
          <View style={styles.streamsGrid} key="streams-grid">
            {filteredStreams.map(stream => {
              const handleStreamPress = () => {
                if (!isCurrentOrderCompleted && stream) {
                  // Check if blocked due to offline limit
                  if (offlineStatus.isBlocked) {
                    setShowOfflineBlockedModal(true);
                    return;
                  }

                  // Track recently used profile
                  setRecentlyUsedProfiles(prev => {
                    const filtered = prev.filter(id => id !== stream.id);
                    return [stream.id, ...filtered].slice(0, 5);
                  });

                  setSelectedStream(stream.profileName);
                  setSelectedStreamCode(stream.profileNumber);
                  setSelectedStreamId(stream.id);
                  setCylinderCount(''); // Reset cylinder count when stream changes
                  setCurrentStep('container-selection');
                }
              };

              // Get category badge variant and style
              const getCategoryBadgeConfig = (category: string) => {
                const categoryLower = category.toLowerCase().trim();
                if (categoryLower === 'non-haz') {
                  return {
                    variant: 'outline' as const,
                    style: styles.categoryBadgeGreen,
                    textStyle: styles.categoryBadgeTextWhite,
                  };
                } else if (categoryLower === 'hazardous') {
                  return {
                    variant: 'outline' as const,
                    style: styles.categoryBadgeRed,
                    textStyle: styles.categoryBadgeTextWhite,
                  };
                } else if (categoryLower === 'universal') {
                  return {
                    variant: 'outline' as const,
                    style: styles.categoryBadgeYellow,
                    textStyle: styles.categoryBadgeTextWhite,
                  };
                } else if (categoryLower === 'dea') {
                  return {
                    variant: 'outline' as const,
                    style: styles.categoryBadgeBlue,
                    textStyle: styles.categoryBadgeTextWhite,
                  };
                }
                return {
                  variant: 'secondary' as const,
                  style: undefined,
                  textStyle: undefined,
                };
              };

              const categoryBadgeConfig = getCategoryBadgeConfig(
                stream.category,
              );

              return (
                <TouchableOpacity
                  key={stream.id}
                  style={styles.streamCard}
                  onPress={handleStreamPress}
                  disabled={isCurrentOrderCompleted}
                  activeOpacity={isCurrentOrderCompleted ? 1 : 0.7}>
                  <View style={styles.streamCardHeader}>
                    {recentlyUsedProfiles.includes(stream.id) && (
                      <Badge
                        variant="outline"
                        style={styles.recentlyUsedBadge}
                        textStyle={styles.recentlyUsedBadgeText}>
                        Recently Used
                      </Badge>
                    )}
                  </View>
                  <Text style={styles.streamCardTitle}>
                    {stream.profileName}
                  </Text>
                  <Badge
                    variant={categoryBadgeConfig.variant}
                    style={categoryBadgeConfig.style}
                    textStyle={categoryBadgeConfig.textStyle}>
                    {stream.category}
                  </Badge>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Waste Streams Found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search terms
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
