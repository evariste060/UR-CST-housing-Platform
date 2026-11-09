import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLogout } from '../auth/useLogout';
import { useUnreadCount } from '../lib/notifications';
import { STUDENT_ITEMS } from '../lib/routes';
import {
  SIDE_COUNT,
  SIDE_HEADING,
  SIDE_LABEL,
  SIDE_LINK,
  SIDE_LOGOUT,
  SIDE_TOOLBAR,
} from '../lib/sideNav';
import { useSaved } from '../student/SavedProvider';
import { Icon } from './Icon';
import { t, tNode } from '../i18n';

/**
 * The sidebar beside a signed-in student's own pages, with Log out at the bottom. At tablet width
 * and below it becomes a toolbar of icons along the bottom of the screen, and Log out moves to the
 * header menu.
 */
export function StudentShell({ children }: { children: ReactNode }) {
  const logOut = useLogout();
  const saved = useSaved();
  const unread = useUnreadCount();

  return (
    <div className="shell">
      <nav
        className={`side top-(--hh) h-[calc(100vh-var(--hh)-61px)] ${SIDE_TOOLBAR}`}
        aria-label={t('Student navigation')}
      >
        <p className={`${SIDE_HEADING} max-tablet:hidden`}>{t('Student menu')}</p>
        {STUDENT_ITEMS.map(({ to, label, icon }) => (
          <NavLink key={to} className={SIDE_LINK} to={to} title={label} end={to === '/student'}>
            <Icon name={icon} />
            <span className={SIDE_LABEL}>{tNode(label)}</span>
            {to === '/saved' && saved.ids.length > 0 && (
              <span className={SIDE_COUNT}>
                {tNode(saved.ids.length)}
                <span className="sr-only"> {t('saved')}</span>
              </span>
            )}
            {to === '/notifications' && unread > 0 && (
              <span className={SIDE_COUNT}>
                {unread}
                <span className="sr-only"> {t('unread')}</span>
              </span>
            )}
          </NavLink>
        ))}
        <button type="button" className={SIDE_LOGOUT} onClick={() => void logOut()}>
          <Icon name="logout" />
          {t('Log out')}
        </button>
      </nav>
      <div className="shell-main">{children}</div>
    </div>
  );
}
