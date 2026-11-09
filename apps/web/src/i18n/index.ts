import { useSyncExternalStore } from 'react';
import { fr } from './fr';
import { rw } from './rw';

/**
 * Interface text is written in English in the code, and that English text is the key.
 * Kinyarwanda and French dictionaries map it to a translation. Anything missing falls back to
 * English, so a gap shows English instead of a blank or a key name.
 */
export const LANGUAGES = ['en', 'rw', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language is named in itself, so people can find their own. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'Français',
};

/** Used for <html lang>, dates and the read-aloud voice. */
export const LANGUAGE_TAGS: Record<Language, string> = {
  en: 'en-GB',
  rw: 'rw-RW',
  fr: 'fr-FR',
};

export type Dictionary = Record<string, string>;
const DICTIONARIES: Record<Language, Dictionary> = { en: {}, rw, fr };

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

let current: Language = 'en';
const listeners = new Set<() => void>();

export const getLanguage = () => current;

export function setLanguage(lang: Language) {
  if (lang === current) return;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGE_TAGS[lang];
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the component that calls it when the language changes. */
export const useLanguage = () => useSyncExternalStore(subscribe, getLanguage, getLanguage);

export type Params = Record<string, string | number | null | undefined>;

function fill(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params[name] === undefined || params[name] === null ? whole : String(params[name]),
  );
}

/** Translates interface text. `{name}` placeholders are filled from `params`. */
export function t(text: string, params?: Params): string {
  if (current === 'en') return fill(text, params);
  return fill(DICTIONARIES[current][text] ?? text, params);
}

/**
 * For any value a component was given: strings are translated (finished sentences too, see `tr`),
 * anything else, such as numbers, elements and people's own text, passes through unchanged.
 */
export function tNode<T>(value: T): T | string {
  return typeof value === 'string' ? tr(value) : value;
}

interface Pattern {
  regex: RegExp;
  names: string[];
  to: string;
}
const patternCache = new Map<Language, Pattern[]>();
const messageCache = new Map<string, string>();

function patternsFor(lang: Language): Pattern[] {
  let patterns = patternCache.get(lang);
  if (!patterns) {
    patterns = Object.entries(DICTIONARIES[lang])
      .filter(([key]) => /\{\w+\}/.test(key))
      .map(([key, to]) => {
        const names: string[] = [];
        const source = key
          .split(/(\{\w+\})/)
          .map((part) => {
            const name = /^\{(\w+)\}$/.exec(part)?.[1];
            if (name) {
              names.push(name);
              return '([\\s\\S]+?)';
            }
            return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          })
          .join('');
        return { regex: new RegExp(`^${source}$`), names, to };
      })
      // Longer, more specific sentences are tried first.
      .sort((a, b) => b.regex.source.length - a.regex.source.length);
    patternCache.set(lang, patterns);
  }
  return patterns;
}

/**
 * Translates a finished sentence that already has its values in it, such as a message from
 * the server ("2 listings use this location…") or a stored notification. It finds the
 * dictionary sentence it was made from and puts the same values into the translation.
 */
export function tr(message: string): string {
  if (current === 'en' || !message) return message;
  const exact = DICTIONARIES[current][message];
  if (exact) return exact;
  const cacheKey = `${current}\u0000${message}`;
  const cached = messageCache.get(cacheKey);
  if (cached !== undefined) return cached;
  let out = message;
  for (const { regex, names, to } of patternsFor(current)) {
    const match = regex.exec(message);
    if (!match) continue;
    const params: Params = {};
    names.forEach((name, index) => (params[name] = tr(match[index + 1] ?? '')));
    out = fill(to, params);
    break;
  }
  if (messageCache.size > 2000) messageCache.clear();
  messageCache.set(cacheKey, out);
  return out;
}

/** The locale for numbers and dates in the chosen language. */
export const locale = () => LANGUAGE_TAGS[current];
