import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AddedContainer, OrderData} from '../../types/wasteCollection';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {formatServiceRequestLabel} from './containerGrouping';

interface ContainerDeleteDetailsProps {
  container: AddedContainer;
  orderData: OrderData | null;
  containerNumber?: number;
}

export const ContainerDeleteDetails: React.FC<ContainerDeleteDetailsProps> = ({
  container,
  orderData,
  containerNumber,
}) => {
  const serviceRequestLabel =
    container.serviceTypeId && orderData
      ? formatServiceRequestLabel(container.serviceTypeId, orderData)
      : null;
  const shippingLabel =
    container.shippingLabelBarcode || container.barcode || '—';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {containerNumber != null ? (
          <Text style={styles.segment}>#{containerNumber}</Text>
        ) : null}
        <Text style={[styles.segment, styles.streamName]} numberOfLines={1}>
          {container.streamName}
        </Text>
        <Text style={styles.segment} numberOfLines={1}>
          {container.containerSize} • {container.containerType}
        </Text>
        {container.unitCount != null ? (
          <Text style={[styles.segment, styles.unitCount]} numberOfLines={1}>
            Unit Count: {container.unitCount}
          </Text>
        ) : null}
        {serviceRequestLabel ? (
          <Text style={[styles.segment, styles.serviceRequest]} numberOfLines={1}>
            {serviceRequestLabel}
          </Text>
        ) : null}
        <Text
          style={[styles.segment, styles.shippingLabel]}
          numberOfLines={1}>
          {shippingLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'nowrap',
  },
  segment: {
    ...typography.sm,
    color: colors.mutedForeground,
    flexShrink: 1,
  },
  streamName: {
    color: colors.foreground,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  serviceRequest: {
    flexShrink: 1,
    minWidth: 0,
  },
  unitCount: {
    color: colors.foreground,
    fontWeight: '600',
    flexShrink: 0,
  },
  shippingLabel: {
    color: colors.foreground,
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
});

