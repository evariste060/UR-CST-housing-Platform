import { useEffect, type MouseEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { showsFooter, usesWorkspaceLayout } from '../lib/routes';
import { A11yDock } from './A11yDock';
import { AppShell } from './AppShell';
import { DisplayPanel } from './DisplayPanel';
import { Footer } from './Footer';
import { PublicHeader } from './PublicHeader';
import { QuickFind } from './QuickFind';
import { ReaderBar } from './ReaderBar';
import { RouteAnnouncer } from './RouteAnnouncer';

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
        Skip to content
      </a>
      {workspace ? (
        <>
          <AppShell>
            <Outlet />
          </AppShell>
          <A11yDock />
        </>
      ) : (
        <>
          <PublicHeader />
          <Outlet />
          {showsFooter(pathname) && <Footer />}
        </>
      )}
      <ReaderBar />
      <DisplayPanel />
      <QuickFind />
      <RouteAnnouncer />
    </>
  );
}
