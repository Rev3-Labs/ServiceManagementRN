import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {Button} from '../components/Button';
import {Card, CardContent, CardHeader, CardTitle, CardTitleText} from '../components/Card';
import {
  AppProgressModal,
  AppErrorModal,
  AppSuccessModal,
  AppConfirmModal,
  AppWarningModal,
  AppRecoveryModal,
  showToast,
} from '../components/feedback';
import {colors, spacing, typography} from '../styles/theme';

type DemoKind =
  | 'progress-blocking'
  | 'progress-cancellable'
  | 'error'
  | 'success-modal'
  | 'success-toast'
  | 'confirm'
  | 'warning'
  | 'recovery'
  | null;

interface FeedbackDemoScreenProps {
  onGoBack: () => void;
}

/**
 * Standalone showcase for feedback modal types — not part of the field workflow.
 * Open from Settings → Debug mode (admin).
 */
const FeedbackDemoScreen: React.FC<FeedbackDemoScreenProps> = ({onGoBack}) => {
  const [active, setActive] = useState<DemoKind>(null);
  const [lastAction, setLastAction] = useState('None yet — tap a scenario below.');
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  const close = (note: string) => {
    setActive(null);
    setLastAction(note);
  };

  const startBlockingProgress = () => {
    setActive('progress-blocking');
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }
    progressTimerRef.current = setTimeout(() => {
      progressTimerRef.current = null;
      setActive(null);
      setLastAction('Progress finished (generate manifest demo).');
      showToast('Manifest generated', {type: 'success', title: 'Success'});
    }, 2500);
  };

  const startCancellableProgress = () => {
    setActive('progress-cancellable');
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }
    progressTimerRef.current = setTimeout(() => {
      progressTimerRef.current = null;
      if (active === 'progress-cancellable') {
        // guarded by close from cancel; still clear if still open
      }
      setActive(current => {
        if (current === 'progress-cancellable') {
          setLastAction('Progress finished (sync demo).');
          showToast('Sync complete', {type: 'success'});
          return null;
        }
        return current;
      });
    }, 4000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Feedback modals demo</Text>
          <Text style={styles.subtitle}>
            Generic types for reuse — separate from the field workflow
          </Text>
        </View>
        <Button title="Back" variant="ghost" size="sm" onPress={onGoBack} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Progress</Text>
        <Text style={styles.sectionHint}>
          Blocking for heavy work (manifest). Optional Cancel only if abortable.
          Prefer toast for fire-and-forget print.
        </Text>
        <Button
          title="Progress — generate manifest (blocking)"
          variant="outline"
          size="md"
          fullWidth
          onPress={startBlockingProgress}
          style={styles.row}
        />
        <Button
          title="Progress — sync (cancellable)"
          variant="outline"
          size="md"
          fullWidth
          onPress={startCancellableProgress}
          style={styles.row}
        />
        <Button
          title="Non-blocking — print label (toast only)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => {
            showToast('Label sent to printer', {
              type: 'info',
              title: 'Printing',
            });
            setLastAction('Print used toast (non-blocking) — not a progress modal.');
          }}
          style={styles.row}
        />

        <Text style={styles.sectionLabel}>Error</Text>
        <Button
          title="Error — save failed (Retry + Cancel + Support)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => setActive('error')}
          style={styles.row}
        />

        <Text style={styles.sectionLabel}>Success</Text>
        <Text style={styles.sectionHint}>
          Modal for milestones that need OK. Toast for routine status.
        </Text>
        <Button
          title="Success — work order completed (modal + OK)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => setActive('success-modal')}
          style={styles.row}
        />
        <Button
          title="Success — photo saved (auto-dismiss toast)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => {
            showToast('Photo captured successfully', {
              type: 'success',
              title: 'Success',
            });
            setLastAction('Routine success used toast (auto-dismiss).');
          }}
          style={styles.row}
        />

        <Text style={styles.sectionLabel}>Confirmation</Text>
        <Button
          title="Confirmation — void manifest (destructive)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => setActive('confirm')}
          style={styles.row}
        />

        <Text style={styles.sectionLabel}>Warning</Text>
        <Button
          title="Warning — unusual weight (Cancel + Continue)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => setActive('warning')}
          style={styles.row}
        />

        <Text style={styles.sectionLabel}>Recovery</Text>
        <Button
          title="Recovery — no printer (Retry + Open Settings)"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => setActive('recovery')}
          style={styles.row}
        />
      </ScrollView>

      <AppProgressModal
        visible={active === 'progress-blocking'}
        title="Generating manifest"
        message="Analyzing containers and building documents. This may take a few seconds."
      />

      <AppProgressModal
        visible={active === 'progress-cancellable'}
        title="Syncing route data"
        message="Uploading pending changes. You can cancel if needed."
        onCancel={() => {
          if (progressTimerRef.current) {
            clearTimeout(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          close('Sync cancelled by user.');
        }}
      />

      <AppErrorModal
        visible={active === 'error'}
        title="Save failed"
        message="We could not save vehicle settings. Check the network and try again."
        onRetry={() => close('Error → Retry')}
        onCancel={() => close('Error → Cancel')}
        onContactSupport={() => close('Error → Contact support')}
      />

      <AppSuccessModal
        visible={active === 'success-modal'}
        title="Work order completed"
        message="WO-2024-1234 was closed successfully. You can return to the dashboard."
        onOk={() => close('Success modal → OK')}
      />

      <AppConfirmModal
        visible={active === 'confirm'}
        title="Void manifest"
        message="Are you sure you want to void this manifest? This action cannot be undone."
        confirmLabel="Void"
        destructive
        onCancel={() => close('Confirm → Cancel')}
        onConfirm={() => close('Confirm → Void')}
      />

      <AppWarningModal
        visible={active === 'warning'}
        title="Unusual weight"
        message="Net weight is outside the expected range for this container type. You can still continue if this is correct."
        onCancel={() => close('Warning → Cancel')}
        onContinue={() => close('Warning → Continue')}
      />

      <AppRecoveryModal
        visible={active === 'recovery'}
        title="Printer not connected"
        message="No waste-label printer is available. Connect a printer, then retry."
        detail="Expected: Zebra Bluetooth / USB label printer"
        onRetry={() => close('Recovery → Retry')}
        onOpenSettings={() => close('Recovery → Open Settings')}
        onCancel={() => close('Recovery → Cancel')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs / 2,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  lastAction: {
    ...typography.base,
    color: colors.foreground,
  },
  sectionLabel: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  row: {
    marginBottom: spacing.sm,
  },
});

export default FeedbackDemoScreen;
