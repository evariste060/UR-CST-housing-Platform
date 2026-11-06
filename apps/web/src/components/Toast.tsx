import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hasOpenFocusTrap } from '../lib/useFocusTrap';
import { Icon, type IconName } from './Icon';

const VISIBLE_MS = 4200;
const VISIBLE_WITH_UNDO_MS = 7000;

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type?: ToastType;
  /** Adds an Undo button and keeps the message up for longer. */
  undo?: () => void;
}

interface ToastMessage extends ToastOptions {
  id: number;
  text: string;
}

type ShowToast = (text: string, options?: ToastOptions) => void;

const ICONS: Record<ToastType, IconName> = { success: 'check', error: 'alert', info: 'info' };

const ToastContext = createContext<ShowToast | null>(null);

function toastElementId(id: number) {
  return `toast-${id}`;
}

function isTextField(element: Element | null) {
  return Boolean(element?.matches('input, textarea, select, [contenteditable="true"]'));
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
  onUndoShown: (button: HTMLButtonElement) => void;
}

function ToastItem({ toast, onDismiss, onUndoShown }: ToastItemProps) {
  const { id, text, type = 'success', undo } = toast;
  const hasUndo = Boolean(undo);
  const undoButton = useRef<HTMLButtonElement>(null);
  // The clock stops while focus is on the message, and starts again when focus leaves it.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (undoButton.current) onUndoShown(undoButton.current);
  }, [onUndoShown]);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(id), hasUndo ? VISIBLE_WITH_UNDO_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id, hasUndo, paused, onDismiss]);

  return (
    <div
      id={toastElementId(id)}
      className={type === 'success' ? 'toast' : `toast ${type}`}
      role={type === 'error' ? 'alert' : undefined}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDismiss(id);
      }}
    >
      <Icon name={ICONS[type]} />
      <span className="toast-text" id={`${toastElementId(id)}-text`}>
        {text}
      </span>
      {undo && (
        <button
          ref={undoButton}
          type="button"
          aria-describedby={`${toastElementId(id)}-text`}
          onClick={() => {
            onDismiss(id);
            undo();
          }}
        >
          <Icon name="undo" /> Undo
        </button>
      )}
      <button type="button" className="x" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <Icon name="x" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);
  const usingKeyboard = useRef(false);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = () => {
      usingKeyboard.current = true;
    };
    const onPointerDown = () => {
      usingKeyboard.current = false;
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  // Undo sits at the end of the page and goes after a few seconds, so someone using the keyboard
  // is taken to it. Never during typing or inside a dialog, where a keypress would land on Undo.
  const onUndoShown = useCallback((button: HTMLButtonElement) => {
    const active = document.activeElement;
    if (!usingKeyboard.current || hasOpenFocusTrap() || isTextField(active)) return;
    if (!region.current?.contains(active)) {
      // Focus falls to the body when the control that led here was removed, as with a deleted row.
      returnFocusTo.current = active === document.body ? null : (active as HTMLElement);
    }
    button.focus();
  }, []);

  const dismiss = useCallback((id: number) => {
    const toast = document.getElementById(toastElementId(id));
    if (usingKeyboard.current && toast?.contains(document.activeElement)) {
      const previous = returnFocusTo.current;
      returnFocusTo.current = null;
      if (previous?.isConnected) {
        previous.focus();
      } else {
        const heading = document.querySelector<HTMLElement>('main h1');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus();
      }
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ShowToast>((text, options = {}) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, text, ...options }]);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Stays on the page while empty, so screen readers notice new messages. */}
      <div id="toasts" aria-live="polite" ref={region}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} onUndoShown={onUndoShown} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider.');
  return show;
}
