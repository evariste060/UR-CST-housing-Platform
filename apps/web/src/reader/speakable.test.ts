import { describe, expect, it } from 'vitest';
import { chunkForTap, speakable } from './speakable';

describe('speakable', () => {
  it('says prices, distances and the college name in full', () => {
    expect(speakable('85,000 RWF / month · 0.8 km from UR-CST')).toBe(
      '85,000 Rwandan francs per month , 0.8 kilometres from U.R. C.S.T.',
    );
  });

  it('removes the keyboard hint and extra spaces', () => {
    expect(speakable('Quick find   Ctrl K')).toBe('Quick find');
  });
});

describe('chunkForTap', () => {
  function pageWith(html: string) {
    document.body.innerHTML = `<header><p id="in-header">Logo</p></header><main>${html}</main>`;
    return (selector: string) => document.querySelector(selector) as Element;
  }

  it('reads plain text inside the page', () => {
    const find = pageWith('<p id="text" data-speak="Hello there">Hello</p>');
    expect(chunkForTap(find('#text'))?.text).toBe('Hello there');
  });

  it('leaves links and buttons to work normally', () => {
    const find = pageWith('<p><a id="link" href="/x">Go</a><button id="button">Go</button></p>');
    expect(chunkForTap(find('#link'))).toBeNull();
    expect(chunkForTap(find('#button'))).toBeNull();
  });

  it('ignores anything outside the main content', () => {
    const find = pageWith('<p>Hello</p>');
    expect(chunkForTap(find('#in-header'))).toBeNull();
  });
});
