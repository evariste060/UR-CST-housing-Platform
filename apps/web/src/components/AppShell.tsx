import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminSummary } from '../admin/queries';
import { ROLE_HOME, useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { useDisplay } from '../display/DisplayProvider';
import { useUnreadCount } from '../lib/notifications';
import { PORTAL_THEME } from '../lib/portalTheme';
import { LANDLORD_ITEMS } from '../lib/routes';
import {
  SIDE_COUNT,
  SIDE_HEADING,
  SIDE_LABEL,
  SIDE_LINK,
  SIDE_LOGOUT,
  SIDE_SURFACE,
  SIDE_TOOLBAR,
} from '../lib/sideNav';
import { buttonClass } from './Button';
import { Icon, type IconName } from './Icon';
import { LandlordCount, LandlordTools, isExactItem } from './LandlordNav';
import { NotificationBell } from './NotificationBell';
import { t, tNode } from '../i18n';

const ADMIN_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dash' },
  { to: '/admin/review', label: 'Listing review', icon: 'shieldcheck' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
  { to: '/admin/reports', label: 'Reported properties', icon: 'flag' },
  { to: '/admin/locations', label: 'Locations', icon: 'map' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
];

function QuickFindButton() {
  const { setQuickFindOpen } = useDisplay();
  return (
    <button
      type="button"
      className={`${buttonClass({ variant: 'secondary', size: 'sm' })} quick-btn`}
      aria-keyshortcuts="Control+K"
      aria-label={t('Quick find Ctrl K')}
      onClick={() => setQuickFindOpen(true)}
    >
      <Icon name="search" />
      <span className="hide-m">{t('Quick find')}</span> <kbd className="hide-m">{t('Ctrl K')}</kbd>
    </button>
  );
}

function LandlordSidebar() {
  const { pathname } = useLocation();
  const logOut = useLogout();

  return (
    <nav
      className={`side flex flex-col gap-1 max-tablet:hidden ${SIDE_SURFACE}`}
      aria-label={t('Landlord navigation')}
    >
      <p className={SIDE_HEADING}>{t('Menu')}</p>
      {LANDLORD_ITEMS.map(({ to, label, icon }) => (
        <NavLink key={to} className={SIDE_LINK} to={to} end={isExactItem(to, pathname)}>
          <Icon name={icon} />
          {tNode(label)}
          <LandlordCount to={to} className={SIDE_COUNT} />
        </NavLink>
      ))}
      <div className="mt-auto rounded-lg border border-white/20 bg-white/10 p-4 text-white">
        <p className="m-0 flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-full bg-white/15 text-white">
            <Icon name="help" />
          </span>
          {t('Need help?')}
        </p>
        <p className="mt-2 mb-3 text-sm text-white">
          {t('Questions about your listings or inquiries? We can help.')}
        </p>
        <Link
          className={`${buttonClass({ variant: 'outline', size: 'sm', block: true })} border-white! bg-white! text-side-from! hover:bg-blue-50!`}
          to="/help"
        >
          {t('Contact Support')}
        </Link>
      </div>
      <button type="button" className={`${SIDE_LOGOUT} mt-3!`} onClick={() => void logOut()}>
        <Icon name="logout" />
        {t('Log out')}
      </button>
    </nav>
  );
}

function AdminCount({ to }: { to: string }) {
  const { data } = useAdminSummary();
  const unread = useUnreadCount();
  const [count, meaning] =
    to === '/admin/review'
      ? [data?.counts.pending, 'pending review']
      : to === '/admin/reports'
        ? [data?.counts.openReports, 'open']
        : to === '/notifications'
          ? [unread, 'unread']
          : [0, ''];
  if (!count) return null;
  return (
    <span className={SIDE_COUNT}>
      {count}
      <span className="sr-only"> {tNode(meaning)}</span>
    </span>
  );
}

function AdminSidebar() {
  const logOut = useLogout();
  return (
    <nav className={`side gap-1 ${SIDE_TOOLBAR}`} aria-label={t('Administrator navigation')}>
      <p className={`${SIDE_HEADING} max-tablet:hidden`}>{t('Admin menu')}</p>
      {ADMIN_ITEMS.map(({ to, label, icon }) => (
        <NavLink key={to} className={SIDE_LINK} to={to} title={label} end={to === ROLE_HOME.ADMIN}>
          <Icon name={icon} />
          <span className={SIDE_LABEL}>{tNode(label)}</span>
          <AdminCount to={to} />
        </NavLink>
      ))}
      <button type="button" className={`${SIDE_LOGOUT} mt-auto!`} onClick={() => void logOut()}>
        <Icon name="logout" />
        {t('Log out')}
      </button>
    </nav>
  );
}

/** The layout for landlords and administrators: header, trail and sidebar. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logOut = useLogout();
  const isLandlord = user?.role === 'LANDLORD';
  const [bellOpen, setBellOpen] = useState(false);

  return (
    <div className={user ? PORTAL_THEME : undefined}>
      <header className="header">
        <div className={isLandlord ? 'in max-w-none! gap-4! pl-0! max-tablet:pl-4!' : 'in'}>
          <Link
            className={
              isLandlord
                ? 'logo w-[260px] flex-none self-stretch border-r border-line pl-6 max-tablet:w-auto max-tablet:border-r-0 max-tablet:pl-0'
                : 'logo'
            }
            to="/"
          >
            <span className="logo-mark">
              <Icon name="home" />
            </span>
            <span className={isLandlord ? undefined : 'max-[359px]:sr-only'}>
              {t('UR-CST Housing')}
              <small>{isLandlord ? t('Landlord Portal') : t('Admin Portal')}</small>
            </span>
          </Link>
          {isLandlord ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <LandlordTools />
            </div>
          ) : (
            <div className="header-actions">
              <QuickFindButton />
              <NotificationBell buttonClass="icon-btn" open={bellOpen} onOpenChange={setBellOpen} />
              <span className="t-support hide-m">{user?.fullName}</span>
              <button
                type="button"
                className={buttonClass({ variant: 'secondary', size: 'sm' })}
                aria-label={t('Log out')}
                onClick={logOut}
              >
                <Icon name="logout" />
                <span className="hide-m">{t('Log out')}</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="shell">
        {isLandlord ? <LandlordSidebar /> : <AdminSidebar />}
        <div className="shell-main">{children}</div>
      </div>
    </div>
  );
}
