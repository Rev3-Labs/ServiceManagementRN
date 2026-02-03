// Web mock for Material Icons - used when Icon component runs on web (via webpack alias).
// Uses the full Material Icons glyph map from react-native-vector-icons so every icon works.
import React from 'react';
import {Text, StyleSheet} from 'react-native';

// Load full glyph map from the library so all Material Icons are available (no emoji fallbacks)
const glyphMap = require('react-native-vector-icons/dist/glyphmaps/MaterialIcons.json');

const MaterialIcons = ({name, size = 24, color = '#000', style}) => {
  const codePoint = glyphMap[name];
  const glyph = codePoint != null ? String.fromCodePoint(codePoint) : '?';
  return (
    <Text
      style={[
        styles.icon,
        {fontSize: size, color, fontFamily: 'MaterialIcons'},
        style,
      ]}>
      {glyph}
    </Text>
  );
};

MaterialIcons.getImageSource = () => Promise.resolve(null);
MaterialIcons.loadFont = () => Promise.resolve();

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default MaterialIcons;
