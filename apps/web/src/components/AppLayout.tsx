import { useEffect, type MouseEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { BLUE_THEME, PORTAL_THEME } from '../lib/portalTheme';
import { showsFooter, usesStudentSidebar, usesWorkspaceLayout } from '../lib/routes';
import { A11yDock } from './A11yDock';
import { AppShell } from './AppShell';
import { CompareTray } from './CompareTray';
import { DisplayPanel } from './DisplayPanel';
import { Footer } from './Footer';
import { PublicHeader } from './PublicHeader';
import { QuickFind } from './QuickFind';
import { ReaderBar } from './ReaderBar';
import { RouteAnnouncer } from './RouteAnnouncer';
import { StudentShell } from './StudentShell';
import { t } from '../i18n';

function skipToContent(event: MouseEvent) {
  event.preventDefault();
  const main = document.querySelector<HTMLElement>('main');
  if (!main) return;
  main.setAttribute('tabindex', '-1');
  main.focus();
}

/** Picks the header for the page and adds the tools that every page has. */
export function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const workspace = usesWorkspaceLayout(pathname, user?.role);

  useEffect(() => {
    document.body.classList.toggle('ph-page', !workspace);
  }, [workspace]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={skipToContent}>
        {t('Skip to content')}
      </a>
      {workspace ? (
        <>
          <AppShell>
            <Outlet />
          </AppShell>
          {/* The landlord header has Listen and the display controls itself. */}
          {user?.role !== 'LANDLORD' && <A11yDock />}
        </>
      ) : (
        // A signed-in student gets the portal look on every page. Guests get the same blue.
        <div className={user?.role === 'STUDENT' ? PORTAL_THEME : BLUE_THEME}>
          <PublicHeader />
          {usesStudentSidebar(pathname, user?.role) ? (
            <StudentShell>
              <Outlet />
            </StudentShell>
          ) : (
            <Outlet />
          )}
          {showsFooter(pathname) && <Footer />}
        </div>
      )}
      <CompareTray />
      <ReaderBar />
      <DisplayPanel />
      <QuickFind />
      <RouteAnnouncer />
    </>
  );
}
