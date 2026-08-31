import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon} from '../Icon';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../../styles/theme';
import {
  hideToast,
  subscribeToast,
  ToastPayload,
  ToastType,
} from './toastService';

const TYPE_ICON: Record<ToastType, {name: string; color: string}> = {
  success: {name: 'check-circle', color: colors.success},
  error: {name: 'error', color: colors.destructive},
  warning: {name: 'warning', color: colors.warning},
  info: {name: 'info', color: colors.info},
};

const TYPE_BORDER: Record<ToastType, string> = {
  success: colors.success,
  error: colors.destructive,
  warning: colors.warning,
  info: colors.info,
};

/**
 * Mount once near the app root. Renders a bottom snackbar above safe area /
 * footer chrome. Tap to dismiss.
 */
export const AppToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const announcement = toast.title
      ? `${toast.title}. ${toast.message}`
      : toast.message;
    AccessibilityInfo.announceForAccessibility?.(announcement);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const icon = TYPE_ICON[toast.type];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: Math.max(insets.bottom, spacing.md) + spacing.lg,
          paddingHorizontal: spacing.lg,
        },
      ]}>
      <TouchableOpacity
        style={[styles.bar, {borderColor: TYPE_BORDER[toast.type]}]}
        onPress={hideToast}
        activeOpacity={0.9}
        accessibilityRole="alert"
        accessibilityLabel={
          toast.title ? `${toast.title}. ${toast.message}` : toast.message
        }>
        <View
          style={[
            styles.iconWrap,
            {backgroundColor: TYPE_BORDER[toast.type] + '22'},
          ]}>
          <Icon name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.textWrap}>
          {toast.title ? (
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 568,
    minWidth: 288,
    minHeight: touchTargets.comfortable,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.sm,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  message: {
    ...typography.sm,
    color: colors.foreground,
    fontWeight: '500',
  },
});
