import React from 'react';
import {Switch as RNSwitch, StyleSheet} from 'react-native';
import {colors} from '../styles/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{false: colors.border, true: colors.primary}}
      thumbColor={colors.card}
      ios_backgroundColor={colors.border}
    />
  );
};

