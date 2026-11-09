import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from '../components/Toast';
import {
  PREF_DEFAULT,
  applyPrefs,
  clearPrefs,
  loadPrefs,
  prefMessage,
  savePrefs,
  type PrefKey,
  type Prefs,
} from './prefs';

interface DisplayContextValue {
  prefs: Prefs;
  setPref: (key: PrefKey, value: string) => void;
  resetPrefs: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  quickFindOpen: boolean;
  setQuickFindOpen: (open: boolean) => void;
}

const DisplayContext = createContext<DisplayContextValue | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [quickFindOpen, setQuickFindOpen] = useState(false);

  useLayoutEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  const setPref = useCallback(
    (key: PrefKey, value: string) => {
      const next = { ...loadPrefs(), [key]: value };
      savePrefs(next);
      setPrefs((current) => ({ ...current, [key]: value }));
      toast(prefMessage(key, value));
    },
    [toast],
  );

  const resetPrefs = useCallback(() => {
    // The language is not a display setting: a reset keeps it, so nobody is sent back to English.
    const { lang } = loadPrefs();
    clearPrefs();
    const next = { ...PREF_DEFAULT, lang };
    if (lang !== PREF_DEFAULT.lang) savePrefs(next);
    setPrefs(next);
    toast('Display settings reset to default.');
  }, [toast]);

  const value = useMemo(
    () => ({
      prefs,
      setPref,
      resetPrefs,
      panelOpen,
      setPanelOpen,
      quickFindOpen,
      setQuickFindOpen,
    }),
    [prefs, setPref, resetPrefs, panelOpen, quickFindOpen],
  );

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplay() {
  const value = useContext(DisplayContext);
  if (!value) throw new Error('useDisplay must be used inside DisplayProvider.');
  return value;
}
