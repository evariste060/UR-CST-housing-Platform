import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

const VISIBLE_MS = 4200;

interface ToastMessage {
  id: number;
  text: string;
}

type ShowToast = (text: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (text) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, text }]);
      setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div id="toasts">
        {toasts.map(({ id, text }) => (
          <div key={id} className="toast" role="status">
            <Icon name="check" />
            <span className="toast-text">{text}</span>
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
