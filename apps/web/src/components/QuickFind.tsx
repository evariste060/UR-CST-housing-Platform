import { useQuery } from '@tanstack/react-query';
import { EMPTY_FILTERS } from '@urcst/shared';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { DISPLAY_SETTINGS, pageLabel, searchQuickFind } from '../lib/routes';
import { api } from '../lib/api';
import { formatRwf, formatKm } from '../lib/format';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useLocations } from '../student/queries';
import { useRunSearch } from '../student/useHistory';
import { Icon, type IconName } from './Icon';

const MAX_LISTINGS = 6;

function QuickFindItem({
  icon,
  title,
  detail,
  onOpen,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button type="button" className="qf-item" onClick={onOpen}>
        <Icon name={icon} />
        <span>
          <b>{title}</b>
          {detail && <span className="t-support choice-text">{detail}</span>}
        </span>
        <Icon name="chevR" />
      </button>
    </li>
  );
}

function useQuickFindData(query: string) {
  const text = query.trim();
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const { data: locations = [] } = useLocations();
  const { data } = useQuery({
    queryKey: ['quick-find', text],
    queryFn: () => api.properties(new URLSearchParams({ q: text, pageSize: String(MAX_LISTINGS) })),
    enabled: text.length > 0,
  });

  const areas = words.length
    ? locations.filter(({ name }) => {
        const label = `rooms in ${name}`.toLowerCase();
        return words.every((word) => label.includes(word));
      })
    : [];
  return { areas, listings: text ? (data?.items ?? []) : [] };
}

function QuickFindDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { setPanelOpen } = useDisplay();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const runSearch = useRunSearch();
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useFocusTrap(box, { onEscape: onClose, initialFocus: () => input.current });

  const pages = searchQuickFind(query, user?.role);
  const { areas, listings } = useQuickFindData(query);

  function open(to: string) {
    onClose();
    if (to === DISPLAY_SETTINGS) setPanelOpen(true);
    else navigate(to);
  }

  function openArea(name: string) {
    onClose();
    runSearch({ ...EMPTY_FILTERS, q: name });
  }

  const found = pages.length + areas.length + listings.length;

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
          {pages.length > 0 && (
            <>
              <p className="qf-h">{query ? 'Pages' : 'Go to'}</p>
              <ul>
                {pages.map(({ label, to, icon }) => (
                  <QuickFindItem key={to} icon={icon} title={label} onOpen={() => open(to)} />
                ))}
              </ul>
            </>
          )}
          {areas.length > 0 && (
            <>
              <p className="qf-h">Neighbourhoods</p>
              <ul>
                {areas.map(({ id, name, distanceKm }) => (
                  <QuickFindItem
                    key={id}
                    icon="pin"
                    title={`Rooms in ${name}`}
                    detail={`About ${formatKm(distanceKm)} from UR-CST`}
                    onOpen={() => openArea(name)}
                  />
                ))}
              </ul>
            </>
          )}
          {listings.length > 0 && (
            <>
              <p className="qf-h">Accommodation</p>
              <ul>
                {listings.map(({ id, title, rentRwf, distanceKm, availability }) => (
                  <QuickFindItem
                    key={id}
                    icon="home"
                    title={title}
                    detail={`${formatRwf(rentRwf)} · ${formatKm(distanceKm)} · ${
                      availability === 'AVAILABLE' ? 'Available' : 'Occupied'
                    }`}
                    onOpen={() => open(`/properties/${id}`)}
                  />
                ))}
              </ul>
            </>
          )}
          {found === 0 && (
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
