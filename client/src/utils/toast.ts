// Lightweight, dependency-free toast/notification bus. Replaces the
// blocking window.alert() calls that were scattered across the app for
// error/success messages: a native alert() freezes the ENTIRE page —
// including scrolling and all touch input — until it's dismissed, which
// is a major source of the "site is hanging" reports on both desktop and
// mobile (an alert can render off-screen or behind the keyboard on some
// mobile browsers, making the freeze look like an unexplained hang).
//
// This is a simple pub/sub singleton (no React context needed) so any
// page or utility file can call showToast(...) without prop-drilling.
// <ToastContainer /> (mounted once in App.tsx) subscribes and renders
// the active toasts as small, non-blocking, auto-dismissing cards.

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => listeners.delete(listener);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function showToast(message: string, type: ToastType = 'error', durationMs = 5000) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, message, type }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}
