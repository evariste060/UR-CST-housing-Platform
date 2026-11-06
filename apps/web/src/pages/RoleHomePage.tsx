import { useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { Button } from '../components/Button';

/** Temporary. The real dashboards arrive in Phases 4, 5 and 6. */
export function RoleHomePage({ title }: { title: string }) {
  const { user } = useAuth();
  const logOut = useLogout();

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{title}</h1>
          <p className="muted">Logged in as {user?.fullName}.</p>
        </div>
        {/* Landlords and administrators log out from the header. Students get the Account page
            in Phase 4, which replaces this button. */}
        {user?.role === 'STUDENT' && (
          <Button variant="secondary" icon="logout" onClick={logOut}>
            Log out
          </Button>
        )}
      </div>
    </main>
  );
}
