import { isLanguage, LANGUAGE_NAMES, LANGUAGES, setLanguage, type Language } from '../i18n';

export const PREFS_KEY = 'urcst-prefs';

export const PREF_DEFAULT = {
  font: 'inter',
  size: 'normal',
  spacing: 'normal',
  contrast: 'standard',
  highlight: 'off',
  theme: 'light',
  rate: '1',
  clickRead: 'off',
  lang: 'en',
};

export type Prefs = typeof PREF_DEFAULT;
export type PrefKey = keyof Prefs;

export const FONTS = {
  inter: {
    label: 'Inter',
    family: 'Inter, system-ui, sans-serif',
    description: 'Clean and modern (default)',
  },
  atkinson: {
    label: 'Atkinson Hyperlegible',
    family: '"Atkinson Hyperlegible", Arial, sans-serif',
    description: 'Designed for people with low vision',
  },
  lexend: {
    label: 'Lexend',
    family: 'Lexend, Arial, sans-serif',
    description: 'Wider letters, easier to read',
  },
  merriweather: {
    label: 'Merriweather',
    family: 'Merriweather, Georgia, serif',
    description: 'Classic book-style letters',
  },
  system: {
    label: "My device's font",
    family: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    description: 'The font your phone or computer uses',
  },
} as const;

export type FontName = keyof typeof FONTS;

export const PREF_LABELS = {
  size: { small: 'Small', normal: 'Normal', large: 'Large', xl: 'Extra large' },
  spacing: { normal: 'Normal', relaxed: 'Relaxed' },
  contrast: { standard: 'Standard', high: 'High contrast' },
  highlight: { off: 'Off', on: 'On' },
  theme: { light: 'Light', dark: 'Dark' },
  rate: { '0.8': 'Slow', '1': 'Normal', '1.25': 'Fast' },
  clickRead: { off: 'Off', on: 'On' },
} as const;

const ALLOWED: Record<PrefKey, readonly string[]> = {
  font: Object.keys(FONTS),
  size: Object.keys(PREF_LABELS.size),
  spacing: Object.keys(PREF_LABELS.spacing),
  contrast: Object.keys(PREF_LABELS.contrast),
  highlight: Object.keys(PREF_LABELS.highlight),
  theme: Object.keys(PREF_LABELS.theme),
  rate: Object.keys(PREF_LABELS.rate),
  clickRead: Object.keys(PREF_LABELS.clickRead),
  lang: LANGUAGES,
};

/** Reads saved settings. Anything missing or no longer valid falls back to the default. */
export function loadPrefs(): Prefs {
  const prefs = { ...PREF_DEFAULT };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    if (typeof saved !== 'object' || saved === null) return prefs;
    for (const key of Object.keys(PREF_DEFAULT) as PrefKey[]) {
      const value = (saved as Partial<Record<PrefKey, unknown>>)[key];
      if (typeof value === 'string' && ALLOWED[key].includes(value)) prefs[key] = value;
    }
  } catch {
    // Unreadable or blocked storage only means the defaults are used.
  }
  return prefs;
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // The settings still apply until the page is reloaded.
  }
}

export function clearPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // Nothing was saved in that case.
  }
}

export function applyPrefs(prefs: Prefs, root: HTMLElement = document.documentElement) {
  root.dataset.font = prefs.font;
  root.classList.toggle('small-text', prefs.size === 'small');
  root.classList.toggle('large-text', prefs.size === 'large');
  root.classList.toggle('xl-text', prefs.size === 'xl');
  root.classList.toggle('relaxed', prefs.spacing === 'relaxed');
  root.classList.toggle('hc', prefs.contrast === 'high');
  root.classList.toggle('hl', prefs.highlight === 'on');
  root.classList.toggle('dark', prefs.theme === 'dark');
  if (isLanguage(prefs.lang)) setLanguage(prefs.lang);
}

function labelOf(group: Record<string, string>, value: string) {
  return group[value] ?? value;
}

/** The confirmation shown after a setting changes. */
export function prefMessage(key: PrefKey, value: string): string {
  switch (key) {
    case 'font':
      return `Font changed to ${FONTS[value as FontName].label}.`;
    case 'size':
      return `Text size: ${labelOf(PREF_LABELS.size, value)}.`;
    case 'spacing':
      return `Line spacing: ${labelOf(PREF_LABELS.spacing, value)}.`;
    case 'contrast':
      return `Contrast: ${labelOf(PREF_LABELS.contrast, value)}.`;
    case 'highlight':
      return `Highlight where I am: ${value === 'on' ? 'on' : 'off'}.`;
    case 'rate':
      return `Reading speed: ${labelOf(PREF_LABELS.rate, value)}.`;
    case 'theme':
      return `${value === 'dark' ? 'Dark' : 'Light'} mode is on.`;
    case 'lang':
      return `Language: ${LANGUAGE_NAMES[value as Language] ?? value}.`;
    case 'clickRead':
      return value === 'on'
        ? 'Read what I tap: on. Tap any text to hear it.'
        : 'Read what I tap: off.';
  }
}
