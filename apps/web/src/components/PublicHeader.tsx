import { EMPTY_FILTERS } from '@urcst/shared';
import { useCallback, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { useDisplay } from '../display/DisplayProvider';
import { api } from '../lib/api';
import { pageLabel } from '../lib/routes';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useReader } from '../reader/useReader';
import { useCompare } from '../student/CompareProvider';
import { countResults } from '../student/queries';
import { useSaved } from '../student/SavedProvider';
import { useRunSearch } from '../student/useHistory';
import { buttonClass } from './Button';
import {
  FindMenuItems,
  HeaderMenu,
  LandlordMenuItems,
  LanguageMenuItems,
  TextMenuItems,
  useListProperty,
} from './HeaderMenus';
import { Icon, type IconName } from './Icon';
import { NotificationBell } from './NotificationBell';
import { useToast } from './Toast';
import { t, tNode } from '../i18n';

type MenuName = 'find' | 'landlords' | 'text' | 'lang' | 'notifications';

const FIND_PATHS = ['/search', '/properties'];

function CountPill({ count }: { count?: number }) {
  return count ? <span className="count-pill">{count}</span> : null;
}

/** One item in the main navigation. The current page gets blue text. */
function navItemClass(current: boolean) {
  const base =
    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-2 bg-transparent px-3 py-1.5 text-[0.9375rem] font-normal no-underline transition-colors duration-150 hover:bg-blue-100 aria-expanded:bg-blue-100 [&_.ic]:size-5';
  return current
    ? `${base} border-transparent text-blue hover:text-blue-700 aria-expanded:text-blue-700`
    : `${base} border-transparent text-ink`;
}

function NavItem({
  to,
  icon,
  label,
  end,
  count,
}: {
  to: string;
  icon: IconName;
  label: string;
  end?: boolean;
  count?: number;
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => navItemClass(isActive)}>
      <Icon name={icon} />
      {tNode(label)}
      <CountPill count={count} />
    </NavLink>
  );
}

function SheetLink({
  to,
  icon,
  label,
  count,
}: {
  to: string;
  icon: IconName;
  label: string;
  count?: number;
}) {
  return (
    <NavLink to={to} end>
      <Icon name={icon} />
      {tNode(label)}
      <CountPill count={count} />
    </NavLink>
  );
}

function MobileSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { prefs, setPref, setPanelOpen } = useDisplay();
  const logOut = useLogout();
  const listProperty = useListProperty();
  const saved = useSaved();
  const compare = useCompare();
  const sheet = useRef<HTMLDivElement>(null);
  useFocusTrap(sheet, { onEscape: onClose });

  const isStudent = user?.role === 'STUDENT';
  const dark = prefs.theme === 'dark';

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="mobile-nav" id="mnav" onClick={closeOnBackdrop}>
      <div ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label={t('Menu')}>
        <div className="row-between sheet-head">
          <span className="logo">
            <span className="logo-mark2">
              <Icon name="logoHouse" />
            </span>
            <span>{t('UR-CST Housing')}</span>
          </span>
          <button type="button" className="icon-btn" aria-label={t('Close menu')} onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <SheetLink to="/" icon="home" label={t('Home')} />
        <SheetLink to="/search" icon="search" label={t('Find Housing')} />
        <SheetLink
          to="/saved"
          icon="heart"
          label={t('Saved Properties')}
          count={saved.ids.length}
        />
        <SheetLink to="/compare" icon="layers" label={t('Compare')} count={compare.ids.length} />
        {isStudent ? (
          <>
            <SheetLink to="/history" icon="clock" label={t('Recently Viewed')} />
            <SheetLink to="/student" icon="dash" label={t('My Dashboard')} />
            <SheetLink to="/account" icon="user" label={t('Account & preferences')} />
          </>
        ) : (
          <SheetLink to="/how-it-works" icon="info" label={t('How It Works')} />
        )}
        <SheetLink to="/help" icon="help" label={t('Support')} />
        <button
          type="button"
          className="nav-link"
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
          className="nav-link"
          onClick={() => setPref('theme', dark ? 'light' : 'dark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} />
          {dark ? t('Light mode') : t('Dark mode')}
        </button>
        {user ? (
          <>
            {!isStudent && (
              <SheetLink to={ROLE_HOME[user.role]} icon="dash" label={t('My workspace')} />
            )}
            <button type="button" className="nav-link" onClick={logOut}>
              <Icon name="logout" />
              {t('Log out')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                onClose();
                listProperty();
              }}
            >
              <Icon name="building" />
              {t('For Landlords: list a property')}
            </button>
            <hr className="divider" />
            <Link className={buttonClass({ variant: 'secondary', block: true })} to="/login">
              {t('Login')}
            </Link>
            <Link className={`${buttonClass({ block: true })} sheet-signup`} to="/register">
              {t('Sign Up')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** The two-row header for students, guests and public pages. */
export function PublicHeader() {
  const { user } = useAuth();
  const { prefs, setPref, setQuickFindOpen } = useDisplay();
  const reader = useReader();
  const { pathname } = useLocation();
  const saved = useSaved();
  const compare = useCompare();
  const runSearch = useRunSearch();
  const toast = useToast();
  // Each remembers the page it was opened on, so moving to another page closes it.
  const [openMenu, setOpenMenu] = useState<{ name: MenuName; pathname: string } | null>(null);
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const menu = openMenu?.pathname === pathname ? openMenu.name : null;
  const sheetOpen = sheetPath === pathname;
  const [search, setSearch] = useState('');

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const menuProps = (name: MenuName) => ({
    open: menu === name,
    onOpenChange: (open: boolean) => setOpenMenu(open ? { name, pathname } : null),
  });

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const text = search.trim();
    try {
      const { filters } = text ? await api.parseSearch(text) : { filters: EMPTY_FILTERS };
      runSearch(filters);
      const count = await countResults(filters);
      const places = `${count} result${count === 1 ? '' : 's'}`;
      toast(
        text
          ? `Showing ${places} for "${text}". Adjust the filters any time.`
          : `Showing all ${count} places.`,
        { type: 'info' },
      );
    } catch {
      // Without smart search, the words still work as a place to look for.
      runSearch({ ...EMPTY_FILTERS, q: text });
    }
  }

  const isStudent = user?.role === 'STUDENT';
  const dark = prefs.theme === 'dark';
  const findCurrent = FIND_PATHS.some((path) => pathname.startsWith(path));
  const home = user && (isStudent ? '/account' : ROLE_HOME[user.role]);

  return (
    <>
      <header className="header ph">
        <div className="in">
          <Link className="logo" to="/">
            <span className="logo-mark2">
              <Icon name="logoHouse" />
            </span>
            <span>{t('UR-CST Housing')}</span>
          </Link>
          <form
            className="hsearch h-11 rounded-sm border border-line-strong bg-card has-[input:focus]:border-blue high-contrast:border-2"
            role="search"
            onSubmit={(event) => void submitSearch(event)}
          >
            <div className="relative min-w-0 flex-1">
              <label htmlFor="hs-q" className="sr-only">
                {t('Search accommodation')}
              </label>
              <span className="pointer-events-none absolute top-1/2 left-[22px] grid -translate-y-1/2 text-subtle max-tablet:left-3.5 [&>.ic]:size-[22px]">
                <Icon name="search" />
              </span>
              <input
                className="size-full min-w-0 rounded-l-[7px] rounded-r-none border-0 bg-card pr-3 pl-16 text-md text-ellipsis text-ink placeholder:text-muted focus:shadow-none focus:outline-none max-tablet:pl-11 max-tablet:text-base"
                id="hs-q"
                value={search}
                placeholder={t('Kiyovu, Single room, Apartment, 80000.... ')}
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="grid w-14 flex-none cursor-pointer place-items-center rounded-l-none rounded-r-[7px] border-0 bg-blue text-white hover:bg-blue-700 max-tablet:w-16 dark:bg-blue dark:hover:bg-blue/85 [&>.ic]:size-6"
              aria-label={t('Search')}
            >
              <Icon name="search" />
            </button>
          </form>
          <div className="hctl">
            <button
              type="button"
              className="tool-btn"
              aria-label={dark ? t('Light Mode') : t('Dark Mode')}
              title={dark ? t('Switch to light mode') : t('Switch to dark mode')}
              onClick={() => setPref('theme', dark ? 'light' : 'dark')}
            >
              <Icon name={dark ? 'sun' : 'moon'} />
              <span>{dark ? t('Light Mode') : t('Dark Mode')}</span>
            </button>
            <button
              type="button"
              className="tool-btn"
              aria-label={t('Listen')}
              title={t('Read this page aloud')}
              onClick={() => reader.start(pageLabel(pathname, user?.role))}
            >
              <Icon name="volume" />
              <span>{t('Listen')}</span>
            </button>
            <div className="hide-m">
              <HeaderMenu
                id="text"
                label={t('Text options')}
                buttonClass="drop-btn"
                button={
                  <>
                    <b className="aa">{t('Aa')}</b> {t('Text')}
                    <Icon name="chevD" />
                  </>
                }
                {...menuProps('text')}
              >
                <TextMenuItems onDone={closeMenu} />
              </HeaderMenu>
            </div>
            <div className="hide-m">
              <HeaderMenu
                id="lang"
                label={t('Language')}
                buttonClass="drop-btn"
                button={
                  <>
                    <Icon name="globe" /> {t('Language')}
                    <Icon name="chevD" />
                  </>
                }
                {...menuProps('lang')}
              >
                <LanguageMenuItems onDone={closeMenu} />
              </HeaderMenu>
            </div>
            {user && (
              <div className="max-[359px]:hidden">
                <NotificationBell buttonClass="icon-btn" {...menuProps('notifications')} />
              </div>
            )}
            {user && home ? (
              <Link className={`${buttonClass({ variant: 'secondary' })} hide-m`} to={home}>
                <Icon name="user" />
                {user.fullName}
              </Link>
            ) : (
              <>
                <Link className={`${buttonClass({ variant: 'outline' })} hide-m`} to="/login">
                  {t('Login')}
                </Link>
                <Link className={`${buttonClass()} hide-m`} to="/register">
                  {t('Sign Up')}
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn qf-m"
              aria-label={t('Quick find')}
              onClick={() => setQuickFindOpen(true)}
            >
              <Icon name="search" />
            </button>
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-expanded={sheetOpen}
              aria-controls="mnav"
              aria-label={t('Open menu')}
              onClick={() => setSheetPath(pathname)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <div className="navrow">
        <div className="in">
          <nav
            className="flex flex-wrap items-center gap-1.5 max-tablet:hidden [&_.hmenu]:right-auto [&_.hmenu]:left-0"
            aria-label={t('Main')}
          >
            <NavItem to="/" end icon="home" label={t('Home')} />
            <HeaderMenu
              id="find"
              label={t('Find Housing')}
              buttonClass={navItemClass(findCurrent)}
              openOnHover
              button={
                <>
                  <Icon name="search" />
                  {t('Find Housing')}
                  <Icon name="chevD" />
                </>
              }
              {...menuProps('find')}
            >
              <FindMenuItems onDone={closeMenu} />
            </HeaderMenu>
            <NavItem
              to="/saved"
              icon="heart"
              label={t('Saved Properties')}
              count={saved.ids.length}
            />
            <NavItem to="/compare" icon="layers" label={t('Compare')} count={compare.ids.length} />
            {isStudent ? (
              <>
                <NavItem to="/history" icon="clock" label={t('Recently Viewed')} />
                <NavItem to="/student" icon="dash" label={t('My Dashboard')} />
              </>
            ) : (
              <>
                <NavItem to="/how-it-works" icon="info" label={t('How It Works')} />
                {user ? (
                  <NavItem to={ROLE_HOME[user.role]} icon="dash" label={t('My Workspace')} />
                ) : (
                  <HeaderMenu
                    id="landlords"
                    label={t('For landlords')}
                    buttonClass={navItemClass(false)}
                    openOnHover
                    button={
                      <>
                        <Icon name="building" />
                        {t('For Landlords')}
                        <Icon name="chevD" />
                      </>
                    }
                    {...menuProps('landlords')}
                  >
                    <LandlordMenuItems onDone={closeMenu} />
                  </HeaderMenu>
                )}
              </>
            )}
            <NavItem to="/help" icon="help" label={t('Support')} />
          </nav>
        </div>
      </div>
      {sheetOpen && <MobileSheet onClose={() => setSheetPath(null)} />}
    </>
  );
}
