export interface ReadChunk {
  /** The block outlined while it is read. */
  element: HTMLElement | null;
  text: string;
}

const READ_SELECTOR =
  'h1, h2, h3, h4, p, li, dl, tr, summary, blockquote, .pcard, .tile, .list-item, .mini, .notice, .facility, .pick-group, .choice-grid, .badge';

/** Rewrites text so the voice says "Rwandan francs" and "kilometres" instead of spelling them. */
export function speakable(text: string): string {
  return text
    .replace(/\bRWF\b/g, 'Rwandan francs')
    .replace(/(\d)\s?km\b/g, '$1 kilometres')
    .replace(/UR-CST/g, 'U.R. C.S.T.')
    .replace(/\/\s?month/g, 'per month')
    .replace(/[·•›]/g, ', ')
    .replace(/Ctrl K/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textOf(element: HTMLElement) {
  return element.dataset.speak ?? element.innerText;
}

/** Splits a page into the blocks read aloud, skipping hidden parts and blocks inside other blocks. */
export function collectChunks(root: Element | null): ReadChunk[] {
  if (!root) return [];
  const blocks = [...root.querySelectorAll<HTMLElement>(READ_SELECTOR)];
  const blockSet = new Set<Element>(blocks);

  return blocks
    .filter((element) => {
      if (element.closest(".sr-only, [aria-hidden='true'], .onpage, .compare-tray")) return false;
      const box = element.getBoundingClientRect();
      if (box.left >= window.innerWidth || box.right <= 0) return false;
      if (!element.offsetParent) return false;
      for (let parent = element.parentElement; parent && parent !== root;) {
        if (blockSet.has(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    })
    .map((element) => ({ element, text: textOf(element) }))
    .filter(({ text }) => text.replace(/\W/g, '').length > 1);
}

/** The block a tap on plain text should read, or null for controls and anything outside main. */
export function chunkForTap(target: Element): ReadChunk | null {
  if (target.closest('a, button, input, select, textarea, label, header')) return null;
  const element =
    target.closest<HTMLElement>(READ_SELECTOR) ?? target.closest<HTMLElement>('p, div');
  if (!element?.closest('main')) return null;
  return { element, text: textOf(element) };
}
