import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (
    message: string,
    variant?: ToastVariant,
    durationMs?: number,
  ) => string;
  addLoadingToast: (message: string) => string;
  updateToast: (
    id: string,
    message: string,
    variant: ToastVariant,
    durationMs?: number,
  ) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_DURATION_MS = 3200;
const LONG_DURATION_MS = 60_000;
const MAX_TOASTS = 4;
const DEDUPE_WINDOW_MS = 1200;

const toastTimeouts = new Map<string, number>();
const recentToastByKey = new Map<string, number>();

function createToastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function scheduleRemoval(
  id: string,
  removeToast: (toastId: string) => void,
  durationMs: number,
): void {
  const existingTimeoutId = toastTimeouts.get(id);
  if (existingTimeoutId) {
    window.clearTimeout(existingTimeoutId);
  }

  const nextTimeoutId = window.setTimeout(() => {
    toastTimeouts.delete(id);
    removeToast(id);
  }, durationMs);

  toastTimeouts.set(id, nextTimeoutId);
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, variant = 'info', durationMs = DEFAULT_DURATION_MS) => {
    const dedupeKey = `${variant}:${message.trim()}`;
    const previousTimestamp = recentToastByKey.get(dedupeKey);
    const currentTimestamp = Date.now();

    if (
      variant !== 'loading' &&
      previousTimestamp &&
      currentTimestamp - previousTimestamp < DEDUPE_WINDOW_MS
    ) {
      return '';
    }

    recentToastByKey.set(dedupeKey, currentTimestamp);
    const id = createToastId();

    set((state) => {
      const nextToasts = [{ id, message, variant }, ...state.toasts];
      return { toasts: nextToasts.slice(0, MAX_TOASTS) };
    });

    scheduleRemoval(
      id,
      (toastId) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== toastId),
        }));
      },
      durationMs,
    );

    return id;
  },
  addLoadingToast: (message) => {
    const id = createToastId();

    set((state) => {
      const nextToasts = [
        { id, message, variant: 'loading' as const },
        ...state.toasts,
      ];
      return { toasts: nextToasts.slice(0, MAX_TOASTS) };
    });

    scheduleRemoval(
      id,
      (toastId) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== toastId),
        }));
      },
      LONG_DURATION_MS,
    );

    return id;
  },
  updateToast: (id, message, variant, durationMs = DEFAULT_DURATION_MS) => {
    let wasUpdated = false;

    set((state) => {
      const nextToasts = state.toasts.map((toast) => {
        if (toast.id !== id) return toast;
        wasUpdated = true;
        return { ...toast, message, variant };
      });

      return { toasts: nextToasts };
    });

    if (!wasUpdated) {
      return;
    }

    scheduleRemoval(
      id,
      (toastId) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== toastId),
        }));
      },
      durationMs,
    );
  },
  removeToast: (id) => {
    const timeoutId = toastTimeouts.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeouts.delete(id);
    }

    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
