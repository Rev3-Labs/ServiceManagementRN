// Web mock for react-native-vector-icons/MaterialIcons
import React from 'react';
import {Text, StyleSheet} from 'react-native';

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
};

const MaterialIcons = ({name, size = 24, color = '#000', style}: any) => {
  const fallbackChar = iconMap[name] || '?';
  return (
    <Text style={[styles.icon, {fontSize: size, color}, style]}>
      {fallbackChar}
    </Text>
  );
};

MaterialIcons.getImageSource = () => Promise.resolve(null);
MaterialIcons.loadFont = () => Promise.resolve();

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'System',
    textAlign: 'center',
  },
});

export default MaterialIcons;







