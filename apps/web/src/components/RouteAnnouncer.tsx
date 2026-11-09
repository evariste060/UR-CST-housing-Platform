import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { pageLabel } from '../lib/routes';
import { tNode, tr, useLanguage } from '../i18n';

const SITE_NAME = 'UR-CST Student Housing';
const HEADING_WAIT_MS = 3000;

function focusHeading(heading: Element) {
  heading.setAttribute('tabindex', '-1');
  (heading as HTMLElement).focus({ preventScroll: true });
}

/** After each page change: moves focus to the page title, says "Now on: …" and updates the tab. */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const previous = useRef(pathname);
  const label = pageLabel(pathname, user?.role);
  const lang = useLanguage();

  useEffect(() => {
    document.title = pathname === '/' ? tr(SITE_NAME) : `${tr(label)} · ${tr(SITE_NAME)}`;
  }, [pathname, label, lang]);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    window.scrollTo?.(0, 0);

    // Protected pages show their heading once the session check ends, and a dialog that led here
    // hands focus back as it closes, so this waits a frame and then for the heading to appear.
    const observer = new MutationObserver(() => {
      const heading = document.querySelector('main h1');
      if (!heading) return;
      focusHeading(heading);
      stop();
    });
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector('main h1');
      if (heading) {
        focusHeading(heading);
        return;
      }
      observer.observe(document.body, { childList: true, subtree: true });
    });
    const timer = setTimeout(() => observer.disconnect(), HEADING_WAIT_MS);
    function stop() {
      observer.disconnect();
      clearTimeout(timer);
    }

    setMessage(`Now on: ${label}`);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [pathname, label]);

  return (
    <div id="announcer" className="sr-only" aria-live="polite">
      {tNode(message)}
    </div>
  );
}
