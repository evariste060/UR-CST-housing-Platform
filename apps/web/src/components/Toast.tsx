import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (text, options = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, text, ...options }]);
      setTimeout(() => dismiss(id), options.undo ? VISIBLE_WITH_UNDO_MS : VISIBLE_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Stays on the page while empty, so screen readers notice new messages. */}
      <div id="toasts" aria-live="polite">
        {toasts.map(({ id, text, type = 'success', undo }) => (
          <div
            key={id}
            className={type === 'success' ? 'toast' : `toast ${type}`}
            role={type === 'error' ? 'alert' : undefined}
          >
            <Icon name={ICONS[type]} />
            <span className="toast-text">{text}</span>
            {undo && (
              <button
                type="button"
                onClick={() => {
                  dismiss(id);
                  undo();
                }}
              >
                <Icon name="undo" /> Undo
              </button>
            )}
            <button type="button" className="x" aria-label="Dismiss" onClick={() => dismiss(id)}>
              <Icon name="x" />
            </button>
          </div>
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
