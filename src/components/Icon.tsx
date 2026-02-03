import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../styles/theme';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Icon component using Google Material Icons (react-native-vector-icons/MaterialIcons)
 * on all platforms. No emoji or character fallbacks.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = colors.foreground,
  style,
}) => {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
};
