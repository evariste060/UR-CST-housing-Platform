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
import { useToast } from './Toast';

type MenuName = 'find' | 'landlords' | 'text' | 'lang';

const FIND_PATHS = ['/search', '/properties'];

function CountPill({ count }: { count?: number }) {
  return count ? <span className="count-pill">{count}</span> : null;
}

/** One item in the main navigation. The current page gets a blue border. */
function navItemClass(current: boolean) {
  const base =
    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-2 bg-transparent px-3 py-1.5 text-[0.9375rem] font-normal no-underline transition-colors duration-150 hover:bg-blue-100 aria-expanded:bg-blue-100 [&_.ic]:size-5';
  return current
    ? `${base} border-blue text-blue hover:text-blue-700 aria-expanded:text-blue-700`
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
      {label}
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
      {label}
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
      <div ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="row-between sheet-head">
          <span className="logo">
            <span className="logo-mark2">
              <Icon name="logoHouse" />
            </span>
            <span>UR-CST Housing</span>
          </span>
          <button type="button" className="icon-btn" aria-label="Close menu" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <SheetLink to="/" icon="home" label="Home" />
        <SheetLink to="/search" icon="search" label="Find Housing" />
        <SheetLink to="/saved" icon="heart" label="Saved Properties" count={saved.ids.length} />
        <SheetLink to="/compare" icon="layers" label="Compare" count={compare.ids.length} />
        {isStudent ? (
          <>
            <SheetLink to="/history" icon="clock" label="Recently Viewed" />
            <SheetLink to="/student" icon="dash" label="My Dashboard" />
            <SheetLink to="/account" icon="user" label="Account & preferences" />
          </>
        ) : (
          <SheetLink to="/how-it-works" icon="info" label="How It Works" />
        )}
        <SheetLink to="/help" icon="help" label="Support" />
        <button
          type="button"
          className="nav-link"
          onClick={() => {
            onClose();
            setPanelOpen(true);
          }}
        >
          <Icon name="text" />
          Text, font &amp; display
        </button>
        <button
          type="button"
          className="nav-link"
          onClick={() => setPref('theme', dark ? 'light' : 'dark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} />
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        {user ? (
          <>
            {!isStudent && <SheetLink to={ROLE_HOME[user.role]} icon="dash" label="My workspace" />}
            <button type="button" className="nav-link" onClick={logOut}>
              <Icon name="logout" />
              Log out
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
              For Landlords: list a property
            </button>
            <hr className="divider" />
            <Link className={buttonClass({ variant: 'secondary', block: true })} to="/login">
              Login
            </Link>
            <Link className={`${buttonClass({ block: true })} sheet-signup`} to="/register">
              Sign Up
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
            <span>
              UR-CST Housing
              <small>Student Accommodation Platform</small>
            </span>
          </Link>
          <form className="hsearch" role="search" onSubmit={(event) => void submitSearch(event)}>
            <div className="input-icon">
              <Icon name="search" />
              <label htmlFor="hs-q" className="sr-only">
                Search accommodation
              </label>
              <input
                className="input"
                id="hs-q"
                value={search}
                placeholder="Search accommodation (e.g., Kiyovu, single room, under 100,000 RWF)"
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          <div className="hctl">
            <button
              type="button"
              className="tool-btn"
              aria-label={dark ? 'Light Mode' : 'Dark Mode'}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setPref('theme', dark ? 'light' : 'dark')}
            >
              <Icon name={dark ? 'sun' : 'moon'} />
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              type="button"
              className="tool-btn"
              aria-label="Listen"
              title="Read this page aloud"
              onClick={() => reader.start(pageLabel(pathname, user?.role))}
            >
              <Icon name="volume" />
              <span>Listen</span>
            </button>
            <div className="hide-m">
              <HeaderMenu
                id="text"
                label="Text options"
                buttonClass="drop-btn"
                button={
                  <>
                    <b className="aa">Aa</b> Text
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
                label="Language"
                buttonClass="drop-btn"
                button={
                  <>
                    <Icon name="globe" /> Language
                    <Icon name="chevD" />
                  </>
                }
                {...menuProps('lang')}
              >
                <LanguageMenuItems onDone={closeMenu} />
              </HeaderMenu>
            </div>
            {user && home ? (
              <Link className={`${buttonClass({ variant: 'secondary' })} hide-m`} to={home}>
                <Icon name="user" />
                {user.fullName}
              </Link>
            ) : (
              <>
                <Link className={`${buttonClass({ variant: 'outline' })} hide-m`} to="/login">
                  Login
                </Link>
                <Link className={`${buttonClass()} hide-m`} to="/register">
                  Sign Up
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn qf-m"
              aria-label="Quick find"
              onClick={() => setQuickFindOpen(true)}
            >
              <Icon name="search" />
            </button>
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-expanded={sheetOpen}
              aria-controls="mnav"
              aria-label="Open menu"
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
            aria-label="Main"
          >
            <NavItem to="/" end icon="home" label="Home" />
            <HeaderMenu
              id="find"
              label="Find Housing"
              buttonClass={navItemClass(findCurrent)}
              openOnHover
              button={
                <>
                  <Icon name="search" />
                  Find Housing
                  <Icon name="chevD" />
                </>
              }
              {...menuProps('find')}
            >
              <FindMenuItems onDone={closeMenu} />
            </HeaderMenu>
            <NavItem to="/saved" icon="heart" label="Saved Properties" count={saved.ids.length} />
            <NavItem to="/compare" icon="layers" label="Compare" count={compare.ids.length} />
            {isStudent ? (
              <>
                <NavItem to="/history" icon="clock" label="Recently Viewed" />
                <NavItem to="/student" icon="dash" label="My Dashboard" />
              </>
            ) : (
              <>
                <NavItem to="/how-it-works" icon="info" label="How It Works" />
                {user ? (
                  <NavItem to={ROLE_HOME[user.role]} icon="dash" label="My Workspace" />
                ) : (
                  <HeaderMenu
                    id="landlords"
                    label="For landlords"
                    buttonClass={navItemClass(false)}
                    openOnHover
                    button={
                      <>
                        <Icon name="building" />
                        For Landlords
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
            <NavItem to="/help" icon="help" label="Support" />
          </nav>
        </div>
      </div>
      {sheetOpen && <MobileSheet onClose={() => setSheetPath(null)} />}
    </>
  );
}
