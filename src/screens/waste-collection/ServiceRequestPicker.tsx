import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Icon} from '../../components/Icon';
import {OrderData} from '../../types/wasteCollection';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {formatServiceRequestLabel} from './containerGrouping';

export interface ServiceRequestPickerProps {
  order: OrderData;
  selectedServiceTypeId: string | null;
  onSelect: (serviceTypeId: string) => void;
  label?: string;
  description?: string;
}

export const ServiceRequestPicker: React.FC<ServiceRequestPickerProps> = ({
  order,
  selectedServiceTypeId,
  onSelect,
  label = 'Service Request',
  description = 'Select which service request this applies to',
}) => (
  <View style={pickerStyles.section}>
    <Text style={pickerStyles.label}>{label}</Text>
    {description ? (
      <Text style={pickerStyles.description}>{description}</Text>
    ) : null}
    <View style={pickerStyles.options}>
      {order.programs.map(serviceTypeId => {
        const isSelected = selectedServiceTypeId === serviceTypeId;
        return (
          <TouchableOpacity
            key={serviceTypeId}
            style={[
              pickerStyles.option,
              isSelected && pickerStyles.optionSelected,
            ]}
            onPress={() => onSelect(serviceTypeId)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{selected: isSelected}}>
            <View style={pickerStyles.optionLeft}>
              <View
                style={[
                  pickerStyles.radio,
                  isSelected && pickerStyles.radioSelected,
                ]}>
                {isSelected ? (
                  <Icon name="check" size={14} color={colors.primaryForeground} />
                ) : null}
              </View>
              <Text
                style={[
                  pickerStyles.optionText,
                  isSelected && pickerStyles.optionTextSelected,
                ]}
                numberOfLines={2}>
                {formatServiceRequestLabel(serviceTypeId, order)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const pickerStyles = StyleSheet.create({
  section: {
    marginBottom: 0,
  },
  label: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.base,
    color: colors.foreground,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
