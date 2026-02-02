import React from 'react';
import {Text, StyleSheet, TextStyle, StyleProp, Platform} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../styles/theme';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// Icon name to Unicode character mapping for web fallback
const iconMap: Record<string, string> = {
  'arrow-back': '←',
  'arrow-forward': '→',
  'keyboard-arrow-down': '▼',
  'keyboard-arrow-up': '▲',
  'close': '✕',
  'check': '✓',
  'warning': '⚠',
  'assignment': '📋',
  'description': '📄',
  'local-shipping': '🚚',
  'check-circle': '✓',
  'error': '❌',
  'info': 'ℹ',
  'radio-button-unchecked': '○',
  'print': '🖨️',
  'camera-alt': '📷',
  'folder': '📁',
  'home': '🏠',
  'inventory': '📦',
  'security': '🛡️',
  'delete': '🗑️',
  'delete-outline': '🗑',
  'edit': '✏️',
  'business': '🏢',
  'pause': '⏸',
  'play-arrow': '▶',
  'sync': '🔄',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = colors.foreground,
  style,
}) => {
  // For web, use fallback characters
  // For native, use MaterialIcons
  if (Platform.OS === 'web') {
    const fallbackChar = iconMap[name] || '?';
    return (
      <Text style={[styles.fallbackIcon, {fontSize: size, color}, style]}>
        {fallbackChar}
      </Text>
    );
  }

  // Native platform - use MaterialIcons
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
};

const styles = StyleSheet.create({
  fallbackIcon: {
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 24,
  },
});
