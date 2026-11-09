import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { pageLabel } from '../lib/routes';
import { useReader } from '../reader/useReader';
import { Icon } from './Icon';
import { t } from '../i18n';

/** Listen and Display for pages without the public header, which has its own controls. */
export function A11yDock() {
  const reader = useReader();
  const { panelOpen, setPanelOpen, setQuickFindOpen } = useDisplay();
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <aside className="a11y-dock" aria-label={t('Listen and display options')}>
      <button
        type="button"
        aria-pressed={reader.active}
        onClick={() =>
          reader.active ? reader.stop() : reader.start(pageLabel(pathname, user?.role))
        }
      >
        <Icon name={reader.active ? 'stop' : 'volume'} />
        <span>{reader.active ? t('Stop') : t('Listen')}</span>
      </button>
      <button
        type="button"
        aria-expanded={panelOpen}
        onClick={() => {
          setQuickFindOpen(false);
          setPanelOpen(true);
        }}
      >
        <Icon name="text" />
        <span>{t('Display')}</span>
      </button>
    </aside>
  );
}
