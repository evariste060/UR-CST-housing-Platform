import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { DISPLAY_SETTINGS, pageLabel, searchQuickFind } from '../lib/routes';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Icon } from './Icon';

function QuickFindDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { setPanelOpen } = useDisplay();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useFocusTrap(box, { onEscape: onClose, initialFocus: () => input.current });

  const pages = searchQuickFind(query, user?.role);

  function open(to: string) {
    onClose();
    if (to === DISPLAY_SETTINGS) setPanelOpen(true);
    else navigate(to);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    const items = [...(box.current?.querySelectorAll<HTMLElement>('.qf-item') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Enter') {
      if (document.activeElement !== input.current) return;
      event.preventDefault();
      items[0]?.click();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      (items[index + 1] ?? items[0])?.focus();
    } else {
      event.preventDefault();
      if (index <= 0) input.current?.focus();
      else items[index - 1]?.focus();
    }
  }

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="qf" onClick={closeOnBackdrop}>
      {/* The arrow keys move between results, so the dialog listens for them. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={box}
        className="qf-box"
        role="dialog"
        aria-modal="true"
        aria-label="Quick find"
        onKeyDown={onKeyDown}
      >
        <div className="qf-top">
          <div className="input-icon qf-field">
            <Icon name="search" />
            <label htmlFor="qf-input" className="sr-only">
              Search pages and accommodation
            </label>
            <input
              ref={input}
              className="input"
              id="qf-input"
              value={query}
              placeholder="Where do you want to go? e.g. Saved, Kiyovu, add accommodation"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close quick find"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <p className="qf-here">
          <Icon name="pin" />
          You are on: <b>{pageLabel(pathname, user?.role)}</b>
        </p>
        <div className="qf-res">
          {pages.length > 0 ? (
            <>
              <p className="qf-h">{query ? 'Pages' : 'Go to'}</p>
              <ul>
                {pages.map(({ label, to, icon }) => (
                  <li key={to}>
                    <button type="button" className="qf-item" onClick={() => open(to)}>
                      <Icon name={icon} />
                      <span>
                        <b>{label}</b>
                      </span>
                      <Icon name="chevR" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted qf-none" role="status">
              Nothing found for &quot;{query}&quot;. Try a neighbourhood like Kiyovu, or a page like
              Saved.
            </p>
          )}
        </div>
        <p className="t-help qf-tip">
          Tip: press Ctrl + K on any page to open this. Use the arrow keys to move, Enter to open.
        </p>
      </div>
    </div>
  );
}

export function QuickFind() {
  const { quickFindOpen, setQuickFindOpen, setPanelOpen } = useDisplay();

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPanelOpen(false);
        setQuickFindOpen(!quickFindOpen);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [quickFindOpen, setPanelOpen, setQuickFindOpen]);

  return quickFindOpen ? <QuickFindDialog onClose={() => setQuickFindOpen(false)} /> : null;
}
