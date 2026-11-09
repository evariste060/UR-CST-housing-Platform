import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { t, tNode } from '../i18n';

const SPY_OFFSET_PX = 190;
const FLASH_MS = 1600;

export interface OnThisPageItem {
  id: string;
  label: string;
  icon: IconName;
}

/** Chips that jump to each section of a long page and light up as you scroll. */
export function OnThisPage({ items }: { items: OnThisPageItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const frame = useRef(0);

  useEffect(() => {
    function spy() {
      let found = items[0]?.id;
      for (const { id } of items) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top < SPY_OFFSET_PX) found = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 && window.scrollY > 0;
      setCurrent(atBottom ? items.at(-1)?.id : found);
    }
    function onScroll() {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(spy);
    }
    spy();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', onScroll);
    };
  }, [items]);

  function jump(id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.setAttribute('tabindex', '-1');
    section.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
    section.classList.add('flash');
    setTimeout(() => section.classList.remove('flash'), FLASH_MS);
  }

  return (
    <nav className="onpage" aria-label={t('On this page')}>
      <span className="t-support">
        <Icon name="target" />
        {t('On this page:')}
      </span>
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="opchip"
          aria-current={id === current ? 'true' : 'false'}
          onClick={() => jump(id)}
        >
          <Icon name={icon} />
          {tNode(label)}
        </button>
      ))}
    </nav>
  );
}
