/**
 * App-wide transient feedback (Material-style snackbar for Zebra tablets).
 * Use for success/status only — not for destructive confirms or form validation.
 *
 * Taxonomy: see .cursor/rules/feedback-ux.mdc
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
  type: ToastType;
  message: string;
  title?: string;
  /** Auto-dismiss duration; default 4000ms. */
  durationMs?: number;
}

type Listener = (toast: ToastPayload | null) => void;

let listener: Listener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let current: ToastPayload | null = null;

function emit(next: ToastPayload | null) {
  current = next;
  listener?.(next);
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

/** Show a bottom snackbar. Replaces any currently visible toast. */
export function showToast(
  message: string,
  options?: {
    type?: ToastType;
    title?: string;
    durationMs?: number;
  },
): void {
  clearHideTimer();
  const payload: ToastPayload = {
    type: options?.type ?? 'success',
    message,
    title: options?.title,
    durationMs: options?.durationMs ?? 4000,
  };
  emit(payload);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    emit(null);
  }, payload.durationMs);
}

export function hideToast(): void {
  clearHideTimer();
  emit(null);
}

/** Used by AppToastHost — only one subscriber expected. */
export function subscribeToast(nextListener: Listener): () => void {
  listener = nextListener;
  if (current) {
    nextListener(current);
  }
  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
}
