import { afterEach, describe, expect, it } from 'vitest';
import {
  PREF_DEFAULT,
  PREFS_KEY,
  applyPrefs,
  clearPrefs,
  loadPrefs,
  prefMessage,
  savePrefs,
} from './prefs';

afterEach(() => {
  localStorage.clear();
});

describe('loadPrefs', () => {
  it('uses the defaults when nothing is saved', () => {
    expect(loadPrefs()).toEqual(PREF_DEFAULT);
  });

  it('returns what was saved', () => {
    savePrefs({ ...PREF_DEFAULT, font: 'lexend', theme: 'dark' });
    expect(loadPrefs()).toMatchObject({ font: 'lexend', theme: 'dark', size: 'normal' });
  });

  it('ignores values that are not allowed', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ font: 'comic', size: 'xl', rate: 9 }));
    expect(loadPrefs()).toEqual({ ...PREF_DEFAULT, size: 'xl' });
  });

  it('survives saved data that is not JSON', () => {
    localStorage.setItem(PREFS_KEY, '{broken');
    expect(loadPrefs()).toEqual(PREF_DEFAULT);
  });

  it('goes back to the defaults after clearing', () => {
    savePrefs({ ...PREF_DEFAULT, contrast: 'high' });
    clearPrefs();
    expect(loadPrefs()).toEqual(PREF_DEFAULT);
  });
});

describe('applyPrefs', () => {
  it('sets a class or attribute for every display preference', () => {
    const root = document.createElement('html');
    applyPrefs(
      {
        ...PREF_DEFAULT,
        font: 'merriweather',
        size: 'xl',
        spacing: 'relaxed',
        contrast: 'high',
        highlight: 'on',
        theme: 'dark',
      },
      root,
    );

    expect(root.dataset.font).toBe('merriweather');
    expect([...root.classList].sort()).toEqual(['dark', 'hc', 'hl', 'relaxed', 'xl-text']);
  });

  it('removes the classes again for the defaults', () => {
    const root = document.createElement('html');
    root.className = 'dark hc hl relaxed xl-text large-text';
    applyPrefs(PREF_DEFAULT, root);
    expect(root.className).toBe('');
  });
});

describe('prefMessage', () => {
  it.each([
    ['font', 'atkinson', 'Font changed to Atkinson Hyperlegible.'],
    ['size', 'large', 'Text size: Large.'],
    ['spacing', 'relaxed', 'Line spacing: Relaxed.'],
    ['contrast', 'high', 'Contrast: High contrast.'],
    ['highlight', 'on', 'Highlight where I am: on.'],
    ['rate', '1.25', 'Reading speed: Fast.'],
    ['theme', 'dark', 'Dark mode is on.'],
    ['clickRead', 'on', 'Read what I tap: on. Tap any text to hear it.'],
  ] as const)('confirms %s in the prototype wording', (key, value, message) => {
    expect(prefMessage(key, value)).toBe(message);
  });
});
