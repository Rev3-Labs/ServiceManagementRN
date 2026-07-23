import React from 'react';
import {View, StyleSheet} from 'react-native';
import {colors} from '../styles/theme';

interface StickyNoteIconProps {
  size?: number;
  /** When true, shows scribble lines; when false, blank note. */
  hasContent?: boolean;
}

/**
 * Custom sticky-note glyph — MaterialIcons does not ship a reliable sticky-note
 * icon in the font set used by this app (e.g. edit-note renders blank).
 * Empty notes render as a blank pad; populated notes show scribble lines.
 */
export const StickyNoteIcon: React.FC<StickyNoteIconProps> = ({
  size = 22,
  hasContent = false,
}) => {
  const fold = Math.max(5, Math.round(size * 0.32));
  const pad = Math.max(3, Math.round(size * 0.18));
  const lineHeight = Math.max(1.5, size * 0.08);
  const paper = hasContent ? '#F5D76E' : '#F7F0C8';
  const accent = hasContent ? colors.foreground : colors.mutedForeground;

  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          backgroundColor: paper,
          borderColor: accent + '33',
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.fold,
          {
            borderTopWidth: fold,
            borderLeftWidth: fold,
            borderTopColor: 'transparent',
            borderLeftColor: accent + (hasContent ? '40' : '28'),
          },
        ]}
      />
      {hasContent && (
        <View
          style={[styles.lines, {paddingHorizontal: pad, paddingTop: pad + 1}]}>
          <View
            style={[
              styles.line,
              {
                height: lineHeight,
                backgroundColor: accent + '66',
                width: '78%',
              },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                height: lineHeight,
                backgroundColor: accent + '66',
                width: '62%',
                marginTop: lineHeight + 1,
              },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                height: lineHeight,
                backgroundColor: accent + '44',
                width: '48%',
                marginTop: lineHeight + 1,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  lines: {
    flex: 1,
  },
  line: {
    borderRadius: 1,
  },
});
