import type { Role } from '@urcst/shared';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ROLE_HOME, useAuth } from './useAuth';

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'a student',
  LANDLORD: 'a landlord',
  ADMIN: 'an administrator',
};

function CheckingAccount() {
  return (
    <main className="page" id="main">
      <p role="status">Checking your account…</p>
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
        <h1 className="state-title">Sign in as {label} to open this page</h1>
        <p>This area is only for {label.replace(/^an? /, '')} accounts.</p>
        <Link className="btn btn-primary" to="/login">
          Go to login
        </Link>
      </div>
    </main>
  );
}

/** Login and registration pages send people who are already logged in to their home page. */
export function GuestOnly() {
  const { user, isPending } = useAuth();

  if (isPending) return <CheckingAccount />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}
