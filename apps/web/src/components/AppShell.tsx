import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { useDisplay } from '../display/DisplayProvider';
import { buttonClass } from './Button';
import { useLandlordSummary } from '../landlord/queries';
import { Icon, type IconName } from './Icon';

interface SideItem {
  to: string;
  label: string;
  icon: IconName;
}

const LANDLORD_ITEMS: SideItem[] = [
  { to: '/landlord', label: 'Dashboard', icon: 'dash' },
  { to: '/landlord/properties', label: 'My properties', icon: 'building' },
  { to: '/landlord/inquiries', label: 'Student inquiries', icon: 'message' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/landlord/account', label: 'Account & preferences', icon: 'user' },
  { to: '/help', label: 'Help', icon: 'help' },
];

const ADMIN_ITEMS: SideItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dash' },
  { to: '/admin/review', label: 'Listing review', icon: 'shieldcheck' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
  { to: '/admin/reports', label: 'Reported properties', icon: 'flag' },
  { to: '/admin/locations', label: 'Locations', icon: 'map' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
];

function LandlordCount({ to }: { to: string }) {
  const { data } = useLandlordSummary();
  const [count, meaning] =
    to === '/landlord/properties' ? [data?.pending, 'pending review'] : [data?.newInquiries, 'new'];

  if (!count) return null;
  return (
    <span className="count-pill">
      {count}
      <span className="sr-only"> {meaning}</span>
    </span>
  );
}

const COUNTED = ['/landlord/properties', '/landlord/inquiries'];

function QuickFindButton() {
  const { setQuickFindOpen } = useDisplay();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm quick-btn"
      aria-keyshortcuts="Control+K"
      aria-label="Quick find Ctrl K"
      onClick={() => setQuickFindOpen(true)}
    >
      <Icon name="search" />
      <span className="hide-m">Quick find</span> <kbd className="hide-m">Ctrl K</kbd>
    </button>
  );
}

/** The layout for landlords and administrators: header, trail and sidebar. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logOut = useLogout();
  const isLandlord = user?.role === 'LANDLORD';
  const roleName = isLandlord ? 'Landlord' : 'Administrator';
  const items = isLandlord ? LANDLORD_ITEMS : ADMIN_ITEMS;

  return (
    <>
      <header className="header">
        <div className="in">
          <Link className="logo" to="/">
            <span className="logo-mark">
              <Icon name="home" />
            </span>
            <span>
              UR-CST Housing
              <small>Student accommodation near campus</small>
            </span>
          </Link>
          <div className="header-actions">
            <QuickFindButton />
            <span className="t-support hide-m">{user?.fullName}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label="Log out"
              onClick={logOut}
            >
              <Icon name="logout" />
              <span className="hide-m">Log out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="shell">
        <nav className="side" aria-label={`${roleName} navigation`}>
          <div className="role-tag">{roleName}</div>
          {isLandlord && (
            <div className="side-cta">
              <Link className={buttonClass({ block: true })} to="/landlord/properties/new">
                <Icon name="plus" />
                Add accommodation
              </Link>
            </div>
          )}
          {items.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={user ? to === ROLE_HOME[user.role] : false}>
              <Icon name={icon} />
              {label}
              {isLandlord && COUNTED.includes(to) && <LandlordCount to={to} />}
            </NavLink>
          ))}
        </nav>
        <div className="shell-main">{children}</div>
      </div>
    </>
  );
}
