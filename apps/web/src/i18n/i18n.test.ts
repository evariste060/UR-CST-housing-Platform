import { afterEach, describe, expect, it } from 'vitest';
import { fr } from './fr';
import { getLanguage, setLanguage, t, tNode, tr } from '.';
import { rw } from './rw';

afterEach(() => setLanguage('en'));

describe('translation', () => {
  it('shows English by default and fills in values', () => {
    expect(getLanguage()).toBe('en');
    expect(t('Save')).toBe('Save');
    expect(t('Edit {name}', { name: 'Kiyovu' })).toBe('Edit Kiyovu');
  });

  it('translates into Kinyarwanda and French', () => {
    setLanguage('rw');
    expect(t('Save')).toBe('Bika');
    expect(t('Edit {name}', { name: 'Kiyovu' })).toBe('Hindura Kiyovu');
    expect(document.documentElement.lang).toBe('rw-RW');
    setLanguage('fr');
    expect(t('Saved to your list. This does not reserve the room.')).toBe(
      'Enregistré dans votre liste. Cela ne réserve pas la chambre.',
    );
    expect(document.documentElement.lang).toBe('fr-FR');
  });

  it('falls back to English for text it does not know, such as a listing title', () => {
    setLanguage('fr');
    expect(t('Kiyovu Garden Single Room')).toBe('Kiyovu Garden Single Room');
    expect(tNode(42)).toBe(42);
  });

  it('translates finished sentences from the server and keeps their values', () => {
    setLanguage('fr');
    expect(tr('Listing approved: Sunny Room is now visible to students.')).toBe(
      'Annonce approuvée : Sunny Room est maintenant visible par les étudiants.',
    );
    expect(
      tr(
        '2 listings use this location. Ask landlords to move them to another neighbourhood first.',
      ),
    ).toBe(
      "2 annonces utilisent ce lieu. Demandez aux propriétaires de les déplacer vers un autre quartier d'abord.",
    );
    // Values that are themselves interface text are translated too.
    expect(tr('Text size: Large.')).toBe('Taille du texte : Grande.');
    setLanguage('rw');
    expect(tr('Please log in to continue.')).toBe('Injira kugira ngo ukomeze.');
  });

  it('keeps every placeholder in every translation', () => {
    const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const dictionary of [rw, fr]) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(names(value), key).toEqual(names(key));
      }
    }
  });
});

// Text that reads the same in every language: names, units and examples.
const SAME_IN_EVERY_LANGUAGE = new Set([
  'Ctrl K',
  'UR-CST Housing',
  '{p0} RWF',
  'km',
  'Aa',
  ', Kigali',
  'RWF',
  'WhatsApp',
  'px',
  'name@example.com',
]);

describe('every piece of interface text has a translation', () => {
  const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!./**'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('in Kinyarwanda and French', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    const missing: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) {
        const key = match[1]!.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        if (SAME_IN_EVERY_LANGUAGE.has(key)) continue;
        // A language leaves out text that reads the same as English (French "Photos").
        if (!(key in rw) && !(key in fr)) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
