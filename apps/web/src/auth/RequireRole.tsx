import type { Role } from '@urcst/shared';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ROLE_HOME, useAuth } from './useAuth';
import { buttonClass } from '../components/Button';
import { t, tNode } from '../i18n';

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'a student',
  LANDLORD: 'a landlord',
  ADMIN: 'an administrator',
};

function CheckingAccount() {
  return (
    <main className="page" id="main">
      <p role="status">{t('Checking your account…')}</p>
    </main>
  );
}

export function RequireRole({ allow }: { allow: Role }) {
  const { user, isPending } = useAuth();

  if (isPending) return <CheckingAccount />;
  if (user?.role === allow) return <Outlet />;

  const label = ROLE_LABEL[allow];

  return (
    <main className="page" id="main">
      <div className="state narrow">
        <span className="state-ic">
          <Icon name="lock" />
        </span>
        <h1 className="state-title">
          {t('Sign in as')} {tNode(label)} {t('to open this page')}
        </h1>
        <p>
          {t('This area is only for')} {tNode(label.replace(/^an? /, ''))} {t('accounts.')}
        </p>
        <Link className={buttonClass()} to="/login">
          {t('Go to login')}
        </Link>
      </div>
    </main>
  );
}

/** Login and registration pages send people who are already logged in to their home page. */
export function GuestOnly() {
  const { user, isPending } = useAuth();
  const { pathname, state } = useLocation() as {
    pathname: string;
    state: { from?: string } | null;
  };

  if (isPending) return <CheckingAccount />;
  if (user) {
    const from = state?.from;
    // Only a path on this site, so a crafted link cannot send someone elsewhere after login.
    const back = from?.startsWith('/') && !from.startsWith('//') ? from : undefined;
    const newStudent = pathname === '/register' && user.role === 'STUDENT';
    return <Navigate to={back ?? (newStudent ? '/search' : ROLE_HOME[user.role])} replace />;
  }
  return <Outlet />;
}
