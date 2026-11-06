import { useRef, type KeyboardEvent } from 'react';

/**
 * Keyboard behaviour for a group of role="radio" buttons: Tab reaches the group once and the
 * arrow keys move the choice, as they do for ordinary radio buttons.
 */
export function useRovingRadio<T extends string>(
  values: readonly T[],
  selected: T | undefined,
  onChange: (value: T) => void,
) {
  const items = useRef(new Map<T, HTMLElement>());
  const tabStop = selected !== undefined && values.includes(selected) ? selected : values[0];

  function move(event: KeyboardEvent, from: T) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const next = values[(values.indexOf(from) + step + values.length) % values.length];
    if (next === undefined) return;
    onChange(next);
    items.current.get(next)?.focus();
  }

  return (value: T) => ({
    type: 'button' as const,
    role: 'radio',
    'aria-checked': value === selected,
    tabIndex: value === tabStop ? 0 : -1,
    ref: (element: HTMLElement | null) => {
      if (element) items.current.set(value, element);
      else items.current.delete(value);
    },
    onClick: () => onChange(value),
    onKeyDown: (event: KeyboardEvent) => move(event, value),
  });
}
