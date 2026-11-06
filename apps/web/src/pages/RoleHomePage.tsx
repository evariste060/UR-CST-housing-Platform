import { useAuth } from '../auth/useAuth';

/** Temporary. The real dashboards arrive in Phases 5 and 6. */
export function RoleHomePage({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{title}</h1>
          <p className="muted">Logged in as {user?.fullName}.</p>
        </div>
      </div>
    </main>
  );
}
