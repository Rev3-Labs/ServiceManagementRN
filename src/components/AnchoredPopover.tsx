import React, {useMemo} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {borderRadius, colors, spacing} from '../styles/theme';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnchoredPopoverProps {
  visible: boolean;
  anchor: AnchorRect | null;
  onClose: () => void;
  children: React.ReactNode;
  /** Preferred menu width. Shrinks if the window is narrower. */
  width?: number;
  style?: ViewStyle;
}

/**
 * Dropdown attached to a measured control. Uses a Modal only as a stacking
 * layer — no dimmed overlay, unlike a centered popup.
 */
export const AnchoredPopover: React.FC<AnchoredPopoverProps> = ({
  visible,
  anchor,
  onClose,
  children,
  width = 280,
  style,
}) => {
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();

  const menuStyle = useMemo(() => {
    if (!anchor) {
      return null;
    }
    const menuWidth = Math.min(width, windowWidth - spacing.md * 2);
    const gap = 6;
    const estimatedHeight = 320;
    let left = anchor.x;
    if (left + menuWidth > windowWidth - spacing.md) {
      left = Math.max(spacing.md, anchor.x + anchor.width - menuWidth);
    }
    if (left < spacing.md) {
      left = spacing.md;
    }

    const belowTop = anchor.y + anchor.height + gap;
    const spaceBelow = windowHeight - belowTop - spacing.md;
    const spaceAbove = anchor.y - spacing.md;
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(spacing.md, anchor.y - Math.min(estimatedHeight, spaceAbove) - gap)
      : belowTop;

    return {
      top,
      left,
      width: menuWidth,
      maxHeight: Math.min(estimatedHeight, windowHeight - top - spacing.md),
    };
  }, [anchor, width, windowHeight, windowWidth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={styles.dismiss}
          onPress={onClose}
          accessibilityLabel="Dismiss menu"
        />
        {menuStyle ? (
          <View style={[styles.menu, menuStyle, style]}>{children}</View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1f2937',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
});
