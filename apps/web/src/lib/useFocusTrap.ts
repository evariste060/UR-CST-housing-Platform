import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialogs can stack, for example Quick find opened over the display panel. Only the top one acts.
const openTraps: symbol[] = [];

export function hasOpenFocusTrap() {
  return openTraps.length > 0;
}

interface FocusTrapOptions {
  onEscape: () => void;
  /** Where focus starts. Defaults to the first control in the dialog. */
  initialFocus?: () => HTMLElement | null;
}

/** Keeps Tab inside a dialog, closes it on Esc and puts focus back where it was on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, options: FocusTrapOptions) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const trap = Symbol('focus trap');
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];

    openTraps.push(trap);
    (latest.current.initialFocus?.() ?? focusables()[0] ?? ref.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (openTraps.at(-1) !== trap) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        latest.current.onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement;
      const outside = !ref.current?.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      openTraps.splice(openTraps.indexOf(trap), 1);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref]);
}
