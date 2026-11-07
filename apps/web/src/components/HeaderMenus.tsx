import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { FONTS, PREF_LABELS, type FontName } from '../display/prefs';
import { useRovingRadio } from '../lib/useRovingRadio';
import { filtersFromParams } from '../student/filters';
import { useRunSearch } from '../student/useHistory';
import { Badge } from './Badge';
import { Icon, type IconName } from './Icon';
import { useToast } from './Toast';

interface MenuProps {
  id: string;
  label: string;
  buttonClass: string;
  /** Extra class for the panel. */
  panelClass?: string;
  button: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Also opens when a mouse rests on it. Touch and keyboard still use the button. */
  openOnHover?: boolean;
}

/** Long enough to move the mouse from the button down into the panel. */
const HOVER_CLOSE_DELAY_MS = 200;

/** A button with a panel under it. Esc and clicking elsewhere close it. */
export function HeaderMenu({
  id,
  label,
  buttonClass,
  panelClass,
  button,
  open,
  onOpenChange,
  children,
  openOnHover = false,
}: MenuProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) {
      openedByHover.current = false;
      return;
    }
    // A mouse passing over the menu must not pull keyboard focus into it.
    if (!openedByHover.current) {
      wrapper.current
        ?.querySelector<HTMLElement>('.hmenu [aria-checked="true"], .hmenu a, .hmenu button')
        ?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onOpenChange(false);
      trigger.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function onFocusIn(event: FocusEvent) {
      if (!wrapper.current?.contains(event.target as Node)) onOpenChange(false);
    }
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) clearTimeout(closeTimer.current);
    return () => clearTimeout(closeTimer.current);
  }, [open]);

  function onPointerEnter(event: ReactPointerEvent) {
    if (!openOnHover || event.pointerType !== 'mouse') return;
    clearTimeout(closeTimer.current);
    if (open) return;
    openedByHover.current = true;
    onOpenChange(true);
  }

  function onPointerLeave(event: ReactPointerEvent) {
    if (!openOnHover || event.pointerType !== 'mouse' || !open) return;
    closeTimer.current = setTimeout(() => {
      const panel = wrapper.current?.querySelector('.hmenu');
      if (!panel?.contains(document.activeElement)) onOpenChange(false);
    }, HOVER_CLOSE_DELAY_MS);
  }

  function onButtonClick() {
    // The menu is already showing from the hover, so this click keeps it there.
    if (openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    onOpenChange(!open);
  }

  return (
    <div
      className="rel"
      ref={wrapper}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        ref={trigger}
        type="button"
        className={buttonClass}
        aria-expanded={open}
        aria-controls={`menu-${id}`}
        onClick={onButtonClick}
      >
        {button}
      </button>
      {open && (
        <div
          className={panelClass ? `hmenu ${panelClass}` : 'hmenu'}
          id={`menu-${id}`}
          role="group"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const FIND_LINKS: { label: string; icon: IconName; search: string }[] = [
  { label: 'All accommodation', icon: 'search', search: '' },
  { label: 'Single rooms', icon: 'bed', search: '?types=SINGLE' },
  { label: 'Shared rooms', icon: 'users', search: '?types=SHARED' },
  { label: 'Studios', icon: 'door', search: '?types=STUDIO' },
  { label: 'Apartments', icon: 'building', search: '?types=APARTMENT' },
  { label: 'Within 1 km of campus', icon: 'pin', search: '?maxDistance=1' },
  { label: 'Under 60,000 RWF', icon: 'coins', search: '?maxRent=60000' },
  { label: 'Available rooms only', icon: 'check', search: '?availableOnly=true' },
];

export function FindMenuItems({ onDone }: { onDone: () => void }) {
  const runSearch = useRunSearch();

  return FIND_LINKS.map(({ label, icon, search }) => (
    <Link
      key={label}
      className="hmenu-item"
      to={`/search${search}`}
      onClick={(event) => {
        event.preventDefault();
        onDone();
        runSearch(filtersFromParams(new URLSearchParams(search)).filters);
      }}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  ));
}

export function useListProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  return function listProperty() {
    if (user?.role === 'LANDLORD') {
      navigate('/landlord/properties/new');
      return;
    }
    toast('Create a free landlord account to list your property.', { type: 'info' });
    navigate('/register', { state: { role: 'LANDLORD' } });
  };
}

export function LandlordMenuItems({ onDone }: { onDone: () => void }) {
  const listProperty = useListProperty();
  return (
    <>
      <button
        type="button"
        className="hmenu-item"
        onClick={() => {
          onDone();
          listProperty();
        }}
      >
        <Icon name="plus" />
        <span>
          <b>List your property</b>
          <span className="t-support choice-text">Free, guided form in 5 short steps</span>
        </span>
      </button>
      <Link className="hmenu-item" to="/login" onClick={onDone}>
        <Icon name="user" />
        <span>Landlord login</span>
      </Link>
      <Link className="hmenu-item" to="/help" onClick={onDone}>
        <Icon name="help" />
        <span>How publishing works</span>
      </Link>
    </>
  );
}

export function TextMenuItems({ onDone }: { onDone: () => void }) {
  const { prefs, setPref, setPanelOpen } = useDisplay();
  const sizes = Object.entries(PREF_LABELS.size);
  const fonts = Object.keys(FONTS) as FontName[];
  const sizeRadio = useRovingRadio(
    sizes.map(([value]) => value),
    prefs.size,
    (value) => setPref('size', value),
  );
  const fontRadio = useRovingRadio(fonts, prefs.font as FontName, (value) =>
    setPref('font', value),
  );

  return (
    <>
      <p className="hmenu-h" id="menu-text-size">
        Text size
      </p>
      <div className="chipset" role="radiogroup" aria-labelledby="menu-text-size">
        {sizes.map(([value, label]) => (
          <button key={value} className="pchip sm" {...sizeRadio(value)}>
            {prefs.size === value && <Icon name="check" />}
            {label}
          </button>
        ))}
      </div>
      <p className="hmenu-h" id="menu-text-font">
        Font style
      </p>
      <div role="radiogroup" aria-labelledby="menu-text-font">
        {fonts.map((value) => (
          <button key={value} className="hmenu-item" {...fontRadio(value)}>
            <span className="hmenu-aa" style={{ fontFamily: FONTS[value].family }}>
              Aa
            </span>
            <span style={{ fontFamily: FONTS[value].family }}>{FONTS[value].label}</span>
            {prefs.font === value && <Icon name="check" />}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="hmenu-item more"
        onClick={() => {
          onDone();
          setPanelOpen(true);
        }}
      >
        <Icon name="palette" />
        <span>All display &amp; audio settings</span>
        <Icon name="chevR" />
      </button>
    </>
  );
}

export function LanguageMenuItems({ onDone }: { onDone: () => void }) {
  return (
    <>
      <button type="button" className="hmenu-item" aria-current="true" onClick={onDone}>
        <span>English</span>
        <Icon name="check" />
      </button>
      <button type="button" className="hmenu-item" disabled>
        <span>Kinyarwanda</span>
        <Badge tone="demo">Planned</Badge>
      </button>
      <button type="button" className="hmenu-item" disabled>
        <span>Français</span>
        <Badge tone="demo">Planned</Badge>
      </button>
      <p className="t-help hmenu-note">
        Kinyarwanda and French are planned for a later version. They are not translated yet.
      </p>
    </>
  );
}
