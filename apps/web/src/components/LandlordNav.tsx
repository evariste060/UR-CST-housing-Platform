import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLogout } from '../auth/useLogout';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { useLandlordSummary } from '../landlord/queries';
import { initials } from '../lib/format';
import { useUnreadCount } from '../lib/notifications';
import { LANDLORD_ITEMS, pageLabel } from '../lib/routes';
import { SIDE_ITEM, SIDE_SURFACE } from '../lib/sideNav';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useReader } from '../reader/useReader';
import { HeaderMenu, LanguageMenuItems, TextMenuItems } from './HeaderMenus';
import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';
import { t, tNode } from '../i18n';

/** A quiet, icon-only header button. Its name is in sr-only text or aria-label. */
const TOOL =
  'inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink transition-colors hover:bg-slate-100';

const COUNTED = ['/landlord/properties', '/landlord/inquiries', '/notifications'];

export function LandlordCount({ to, className }: { to: string; className: string }) {
  const { data } = useLandlordSummary();
  const unread = useUnreadCount();
  if (!COUNTED.includes(to)) return null;

  const [count, meaning] =
    to === '/landlord/properties'
      ? [data?.pending, 'pending review']
      : to === '/notifications'
        ? [unread, 'unread']
        : [data?.newInquiries, 'new'];

  if (!count) return null;
  return (
    <span className={className}>
      {count}
      <span className="sr-only"> {tNode(meaning)}</span>
    </span>
  );
}

/** "My Properties" stays unlit on the add page, which has its own item. */
export function isExactItem(to: string, pathname: string) {
  return (
    to === '/landlord' ||
    to === '/landlord/properties/new' ||
    (to === '/landlord/properties' && pathname === '/landlord/properties/new')
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { prefs, setPref, setPanelOpen } = useDisplay();
  const reader = useReader();
  const logOut = useLogout();
  const sheet = useRef<HTMLDivElement>(null);
  const dark = prefs.theme === 'dark';
  useFocusTrap(sheet, { onEscape: onClose });

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="mobile-nav" id="mnav" onClick={closeOnBackdrop}>
      <div
        ref={sheet}
        className={`sheet ${SIDE_SURFACE}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('Menu')}
      >
        <div className="row-between sheet-head">
          <span className="logo text-white">
            <span className="logo-mark">
              <Icon name="home" />
            </span>
            <span>{t('UR-CST Housing')}</span>
          </span>
          <button
            type="button"
            className="icon-btn text-white hover:bg-white/10"
            aria-label={t('Close menu')}
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <nav className="flex flex-col gap-1" aria-label={t('Landlord menu')}>
          {LANDLORD_ITEMS.map(({ to, label, icon }) => (
            <NavLink key={to} className={SIDE_ITEM} to={to} end={isExactItem(to, pathname)}>
              <Icon name={icon} />
              {tNode(label)}
              <LandlordCount to={to} className="count-pill ml-auto bg-white text-side-from" />
            </NavLink>
          ))}
        </nav>
        <hr className="divider bg-white/20" />
        <button
          type="button"
          className={`nav-link ${SIDE_ITEM}`}
          onClick={() => {
            onClose();
            reader.start(pageLabel(pathname, user?.role));
          }}
        >
          <Icon name="volume" />
          {t('Listen to this page')}
        </button>
        <button
          type="button"
          className={`nav-link ${SIDE_ITEM}`}
          onClick={() => {
            onClose();
            setPanelOpen(true);
          }}
        >
          <Icon name="text" />
          {t('Text, font & display')}
        </button>
        <button
          type="button"
          className={`nav-link ${SIDE_ITEM}`}
          onClick={() => setPref('theme', dark ? 'light' : 'dark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} />
          {dark ? t('Light mode') : t('Dark mode')}
        </button>
        <Link className={SIDE_ITEM} to="/help">
          <Icon name="help" />
          {t('Help & support')}
        </Link>
        <button type="button" className={`nav-link ${SIDE_ITEM}`} onClick={() => void logOut()}>
          <Icon name="logout" />
          {t('Log out')}
        </button>
      </div>
    </div>
  );
}

/** Searches the landlord's own listings on My Properties. */
function PropertySearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/landlord/properties?q=${encodeURIComponent(q)}` : '/landlord/properties');
  }

  return (
    <form
      className="flex h-11 w-[min(420px,100%)] min-w-0 overflow-hidden rounded-md border border-line bg-surface transition-colors focus-within:border-blue focus-within:bg-card max-desktop:hidden"
      role="search"
      onSubmit={submit}
    >
      <label className="sr-only" htmlFor="landlord-search">
        {t('Search your properties')}
      </label>
      <span className="grid w-10 flex-none place-items-center text-muted">
        <Icon name="search" />
      </span>
      <input
        id="landlord-search"
        className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none focus:shadow-none focus-visible:shadow-none"
        type="search"
        value={term}
        placeholder={t('Search your properties')}
        onChange={(event) => setTerm(event.target.value)}
      />
      <button
        type="submit"
        className="grid w-12 flex-none cursor-pointer place-items-center border-0 bg-blue text-white hover:bg-blue-700"
        aria-label={t('Search')}
      >
        <Icon name="search" />
      </button>
    </form>
  );
}

/** The landlord's header controls, and the menu that replaces the sidebar on small screens. */
export function LandlordTools() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { prefs, setPref } = useDisplay();
  const reader = useReader();
  const logOut = useLogout();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Remembers the page it opened on, so going to another page closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawer = drawerPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const dark = prefs.theme === 'dark';
  const name = user?.fullName ?? 'Your account';

  const menuProps = (id: string) => ({
    open: openMenu === id,
    onOpenChange: (open: boolean) => setOpenMenu(open ? id : null),
  });
  const closeMenu = () => setOpenMenu(null);

  return (
    <>
      <PropertySearch />
      <div className="ml-auto flex items-center gap-1">
        <div className="flex items-center gap-1 max-tablet:hidden">
          <button
            type="button"
            className={TOOL}
            title={dark ? t('Switch to light mode') : t('Switch to dark mode')}
            onClick={() => setPref('theme', dark ? 'light' : 'dark')}
          >
            <Icon name={dark ? 'sun' : 'moon'} />
            <span className="sr-only">{dark ? t('Light Mode') : t('Dark Mode')}</span>
          </button>
          <button
            type="button"
            className={TOOL}
            title={t('Read this page aloud')}
            onClick={() => reader.start(pageLabel(pathname, user?.role))}
          >
            <Icon name="volume" />
            <span className="sr-only">{t('Listen')}</span>
          </button>
          <HeaderMenu
            id="text"
            label={t('Text options')}
            buttonClass={TOOL}
            button={
              <>
                <b className="text-[1.0625rem] leading-none" aria-hidden="true">
                  {t('Aa')}
                </b>
                <span className="sr-only">{t('Text')}</span>
              </>
            }
            {...menuProps('text')}
          >
            <TextMenuItems onDone={closeMenu} />
          </HeaderMenu>
          <HeaderMenu
            id="lang"
            label={t('Language')}
            buttonClass={TOOL}
            button={
              <>
                <Icon name="globe" />
                <span className="sr-only">{t('Language')}</span>
              </>
            }
            {...menuProps('lang')}
          >
            <LanguageMenuItems onDone={closeMenu} />
          </HeaderMenu>
        </div>
        <div className="max-[359px]:hidden">
          <NotificationBell buttonClass={TOOL} {...menuProps('notifications')} />
        </div>
        <span className="mx-2 h-8 w-px bg-line max-tablet:hidden" aria-hidden="true" />
        <div className="max-tablet:hidden">
          <HeaderMenu
            id="profile"
            openOnHover
            label={t('Your account')}
            buttonClass="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent py-1 pr-2 pl-1 text-left text-ink transition-colors hover:bg-slate-100"
            button={
              <>
                <span className="grid size-10 flex-none place-items-center rounded-full bg-blue text-sm font-semibold text-white">
                  {initials(name)}
                </span>
                <span className="flex max-w-[180px] min-w-0 flex-col leading-tight whitespace-nowrap max-[1279px]:sr-only">
                  <b className="truncate text-[0.9375rem]">{tNode(name)}</b>
                  <span className="text-sm text-muted">{t('Landlord')}</span>
                </span>
                <Icon name="chevD" />
              </>
            }
            {...menuProps('profile')}
          >
            <Link className="hmenu-item" to="/landlord/account" onClick={closeMenu}>
              <Icon name="user" />
              <span>{t('My Profile')}</span>
            </Link>
            <Link className="hmenu-item" to="/landlord/account#pw-h" onClick={closeMenu}>
              <Icon name="lock" />
              <span>{t('Account Settings')}</span>
            </Link>
            <button
              type="button"
              className="hmenu-item more"
              onClick={() => {
                closeMenu();
                void logOut();
              }}
            >
              <Icon name="logout" />
              <span>{t('Log out')}</span>
            </button>
          </HeaderMenu>
        </div>
        <button
          ref={menuButton}
          type="button"
          className="icon-btn menu-btn"
          aria-expanded={drawer}
          aria-controls="mnav"
          aria-label={t('Open menu')}
          onClick={() => setDrawerPath(pathname)}
        >
          <Icon name="menu" />
        </button>
      </div>
      {drawer && (
        <Drawer
          onClose={() => {
            setDrawerPath(null);
            menuButton.current?.focus();
          }}
        />
      )}
    </>
  );
}
