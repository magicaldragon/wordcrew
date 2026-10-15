import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

/**
 * In-app feedback surface.
 *
 * Native `window.alert` / `window.confirm` break the "installed app" feel — they
 * are OS chrome, block the JS thread and cannot be themed. This module replaces
 * them with a tiny imperative store: any module can call `toast()` or
 * `confirmDialog()` without a context provider, and a single `<FeedbackHost />`
 * mounted at the app root renders the UI.
 */

export type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmItem {
  id: number;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}

const TOAST_TTL_MS = 4000;

let toasts: ToastItem[] = [];
let confirmItem: ConfirmItem | null = null;
let nextId = 1;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a transient message. Falls back to a native alert only if the host is missing. */
export function toast(message: string, kind: ToastKind = 'info'): void {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, TOAST_TTL_MS);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Ask the player to confirm. Resolves `true` on confirm, `false` on cancel/dismiss. */
export function confirmDialog(
  message: string,
  options: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++;
    // Only one confirm can be open at a time — resolve any pending one as cancelled.
    confirmItem?.resolve(false);
    confirmItem = {
      id,
      message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      destructive: options.destructive ?? true,
      resolve,
    };
    emit();
  });
}

function settleConfirm(value: boolean): void {
  const item = confirmItem;
  confirmItem = null;
  emit();
  item?.resolve(value);
}

function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { toasts, confirmItem };
}

const TOAST_STYLES: Record<ToastKind, string> = {
  info: 'border-l-electric-blue',
  success: 'border-l-neon-green',
  error: 'border-l-danger-red',
};

export const FeedbackHost: React.FC = () => {
  const state = useStore();

  useEffect(() => {
    if (!state.confirmItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settleConfirm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.confirmItem]);

  return (
    <>
      {/* Toasts — bottom centre, above everything, non-blocking. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[var(--z-dialog-top)] flex flex-col items-center gap-2 px-3"
        role="status"
        aria-live="polite"
      >
        {state.toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-[var(--r-md)] border border-[var(--hairline-strong)] border-l-4 bg-[var(--surface-2)] px-3 py-2.5 shadow-[var(--elev-4)] animate-fadeInScaleUp ${TOAST_STYLES[t.kind]}`}
          >
            <p className="flex-1 text-sm text-light-text">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="-mr-1 -mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-text transition hover:text-light-text"
              aria-label="Dismiss message"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm — one styled modal, keyboard-dismissable. */}
      {state.confirmItem && (
        <div
          className="fixed inset-0 z-[var(--z-dialog-top)] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => settleConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--r-xl)] border border-[var(--hairline-strong)] bg-[var(--surface-2)] p-5 shadow-[var(--elev-4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-light-text">{state.confirmItem.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settleConfirm(false)}
                className="futuristic-button min-h-[44px] rounded-[var(--r-md)] bg-[var(--surface-3)] px-4 py-2.5 text-sm font-semibold text-muted-text hover:text-light-text"
              >
                {state.confirmItem.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => settleConfirm(true)}
                className={`futuristic-button min-h-[44px] rounded-[var(--r-md)] px-4 py-2.5 text-sm font-bold text-dark-metal ${
                  state.confirmItem.destructive
                    ? 'bg-danger-red hover:bg-red-400'
                    : 'bg-neon-green hover:bg-emerald-400'
                }`}
              >
                {state.confirmItem.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
