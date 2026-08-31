import {StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';

/** Shared chrome for centered feedback modals (Zebra tablet). */
export const feedbackModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 26,
  },
  detail: {
    ...typography.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  /** Two-action footers (confirm / warning): equal side-by-side buttons. */
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  footerCentered: {
    justifyContent: 'center',
  },
  footerButton: {
    flex: 1,
    minWidth: 0,
  },
  progressSpinner: {
    marginBottom: spacing.md,
  },
});
