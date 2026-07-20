import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';
import {
  serviceCenterService,
  ServiceCenter,
} from '../services/serviceCenterService';
import {serviceTypeTimeService} from '../services/serviceTypeTimeService';

export interface DashboardContextBarProps {
  serviceCenter: ServiceCenter | null;
  dashboardStartOfDay: number | null;
}

export const DashboardContextBar: React.FC<DashboardContextBarProps> = ({
  serviceCenter,
  dashboardStartOfDay,
}) => {
  const serviceCenterLabel = serviceCenter
    ? serviceCenterService.getDisplayFormat(false)
    : '—';
  const startOfDayLabel = dashboardStartOfDay
    ? serviceTypeTimeService.formatTime(dashboardStartOfDay)
    : '—';

  return (
    <View
      style={styles.bar}
      accessibilityRole="summary"
      accessibilityLabel={`Service center ${serviceCenterLabel}. Start of day ${startOfDayLabel}.`}>
      <Text style={styles.segment} numberOfLines={1}>
        <Text style={styles.label}>Service center </Text>
        <Text style={styles.value}>{serviceCenterLabel}</Text>
      </Text>
      <Text style={styles.segmentEnd} numberOfLines={1}>
        <Text style={styles.label}>Start of day </Text>
        <Text style={styles.value}>{startOfDayLabel}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.muted,
    gap: spacing.md,
  },
  segment: {
    flex: 1,
    minWidth: 0,
  },
  segmentEnd: {
    flexShrink: 0,
  },
  label: {
    ...typography.xs,
    color: colors.mutedForeground,
  },
  value: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.foreground,
  },
});
