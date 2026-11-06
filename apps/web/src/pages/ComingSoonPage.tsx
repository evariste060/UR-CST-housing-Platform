import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { buttonClass } from '../components/Button';
import { EmptyState } from '../components/StateBlocks';
import { pageLabel } from '../lib/routes';

/** Stands in for pages that later phases build, so navigation never ends at "Page not found". */
export function ComingSoonPage() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <main className="page" id="main">
      <div className="page-head">
        <h1 className="t-page">{pageLabel(pathname, user?.role)}</h1>
      </div>
      <EmptyState
        icon="clock"
        title="This page is being built"
        text="It is not ready yet. You can keep using the rest of the platform."
        actions={
          <Link className={buttonClass()} to="/">
            Go to home
          </Link>
        }
      />
    </main>
  );
}
