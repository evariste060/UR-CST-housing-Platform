import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useDisplay } from '../display/DisplayProvider';
import { FONTS, PREF_LABELS, type PrefKey } from '../display/prefs';
import { pageLabel } from '../lib/routes';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useRovingRadio } from '../lib/useRovingRadio';
import { useReader } from '../reader/useReader';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { badgeClass } from './Badge';
import { LANGUAGE_NAMES, LANGUAGES, t, tNode, type Language } from '../i18n';

interface CardOption {
  value: string;
  title: string;
  sample?: string;
  description?: string;
  style?: CSSProperties;
}

interface GroupProps {
  prefKey: PrefKey;
  icon: IconName;
  title: string;
  help?: string;
  selected: string;
  options: CardOption[];
}

function PrefGroup({ prefKey, icon, title, help, selected, options }: GroupProps) {
  const { prefs, setPref } = useDisplay();
  const headingId = `dph-${prefKey}`;
  const radio = useRovingRadio(
    options.map(({ value }) => value),
    prefs[prefKey],
    (value) => setPref(prefKey, value),
  );

  return (
    <section className="dp-sec" aria-labelledby={headingId}>
      <div className="pick-head">
        <h3 className="t-card" id={headingId}>
          <Icon name={icon} /> {tNode(title)}
        </h3>
        <span className="picked">
          {t('Selected:')} <b>{tNode(selected)}</b>
        </span>
      </div>
      {help && <p className="t-help dp-help">{tNode(help)}</p>}
      <div className="dp-grid" role="radiogroup" aria-labelledby={headingId}>
        {options.map(({ value, title: cardTitle, sample, description, style }) => (
          <button key={value} className="choice dcard" {...radio(value)}>
            {sample && (
              <span className="dsample" style={style}>
                {tNode(sample)}
              </span>
            )}
            <span>
              <b style={style}>{tNode(cardTitle)}</b>
              {description && <span className="t-support choice-text">{tNode(description)}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SubHeading({ id, title, selected }: { id: string; title: string; selected: string }) {
  return (
    <div className="pick-head dp-sub">
      <span className="t-label" id={id}>
        {tNode(title)}
      </span>
      <span className="picked">
        {t('Selected:')} <b>{tNode(selected)}</b>
      </span>
    </div>
  );
}

function ReadAloudSection({ children }: { children: ReactNode }) {
  const { prefs, setPref } = useDisplay();
  const reader = useReader();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const rates = Object.entries(PREF_LABELS.rate);
  const clickValues = ['off', 'on'] as const;
  const rateRadio = useRovingRadio(
    rates.map(([value]) => value),
    prefs.rate,
    (value) => setPref('rate', value),
  );
  const clickRadio = useRovingRadio(clickValues, prefs.clickRead as 'off' | 'on', (value) =>
    setPref('clickRead', value),
  );

  return (
    <section className="dp-sec">
      <div className="pick-head">
        <h3 className="t-card">
          <Icon name="volume" /> {t('Read aloud')}
        </h3>
        {!reader.supported && (
          <span className={badgeClass('pending')}>{t('Not supported in this browser')}</span>
        )}
      </div>
      <p className="t-help dp-help">
        {t('For people who prefer listening. The voice comes from your device.')}
      </p>
      <Button block icon="volume" onClick={() => reader.start(pageLabel(pathname, user?.role))}>
        {t('Listen to this page')}
      </Button>

      <SubHeading
        id="dph-rate"
        title={t('Reading speed')}
        selected={PREF_LABELS.rate[prefs.rate as keyof typeof PREF_LABELS.rate]}
      />
      <div className="chipset" role="radiogroup" aria-labelledby="dph-rate">
        {rates.map(([value, label]) => (
          <button key={value} className="pchip" {...rateRadio(value)}>
            {prefs.rate === value && <Icon name="check" />}
            {tNode(label)}
          </button>
        ))}
      </div>

      <SubHeading
        id="dph-click"
        title={t('Read what I tap')}
        selected={PREF_LABELS.clickRead[prefs.clickRead as 'off' | 'on']}
      />
      <p className="t-help dp-help">
        {t('When on, tap any text on the page to hear it. Buttons and links still work.')}
      </p>
      <div className="dp-grid" role="radiogroup" aria-labelledby="dph-click">
        <button className="choice dcard" {...clickRadio('off')}>
          <span>
            <b>{t('Off')}</b>
          </span>
        </button>
        <button className="choice dcard" {...clickRadio('on')}>
          <span>
            <b>{t('On')}</b>
            <span className="t-support choice-text">{t('Tap text to listen')}</span>
          </span>
        </button>
      </div>
      {children}
    </section>
  );
}

function DisplayDrawer({ onClose }: { onClose: () => void }) {
  const { prefs, resetPrefs } = useDisplay();
  const drawer = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useFocusTrap(drawer, { onEscape: onClose, initialFocus: () => close.current });

  return (
    <>
      {/* The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="drawer-bg" onClick={onClose} />
      <div
        ref={drawer}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dp-title"
      >
        <div className="row-between">
          <h2 className="t-section" id="dp-title">
            {t('Display & audio')}
          </h2>
          <button
            ref={close}
            type="button"
            className="icon-btn"
            aria-label={t('Close display settings')}
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <p className="muted dp-intro">
          {t(
            'Make the platform comfortable for you. Changes apply straight away and are remembered on this device.',
          )}
        </p>
        <div className="dp-preview" aria-hidden="true">
          <span className={`${badgeClass('available')} dp-preview-badge`}>
            <Icon name="check" />
            {t('Available')}
          </span>
          <p className="t-price num dp-preview-price">
            {t('85,000 RWF')} <span className="t-support">{t('/ month')}</span>
          </p>
          <p className="dp-preview-distance">
            <Icon name="pin" /> {t('0.8 km from UR-CST')}
          </p>
          <p className="muted">
            {t('A bright single room in a quiet compound. Water and electricity included.')}
          </p>
        </div>

        <PrefGroup
          prefKey="lang"
          icon="globe"
          title={t('Language')}
          help={t(
            'Menus, buttons and messages change language. Listings stay as the landlord wrote them.',
          )}
          selected={LANGUAGE_NAMES[prefs.lang as Language]}
          options={LANGUAGES.map((value) => ({ value, title: LANGUAGE_NAMES[value] }))}
        />
        <PrefGroup
          prefKey="font"
          icon="text"
          title={t('Font style')}
          help={t('Pick the letters that are easiest for you to read.')}
          selected={FONTS[prefs.font as keyof typeof FONTS].label}
          options={Object.entries(FONTS).map(([value, { label, family, description }]) => ({
            value,
            title: label,
            sample: 'Aa',
            description,
            style: { fontFamily: family },
          }))}
        />
        <PrefGroup
          prefKey="theme"
          icon="moon"
          title={t('Light or dark')}
          help={t('Dark mode is easier on the eyes at night.')}
          selected={PREF_LABELS.theme[prefs.theme as 'light' | 'dark']}
          options={[
            { value: 'light', title: 'Light', description: 'Dark text on light background' },
            { value: 'dark', title: 'Dark', description: 'Light text on dark background' },
          ]}
        />
        <PrefGroup
          prefKey="size"
          icon="text"
          title={t('Text size')}
          selected={PREF_LABELS.size[prefs.size as keyof typeof PREF_LABELS.size]}
          options={[
            { value: 'small', title: 'Small', sample: 'A', style: { fontSize: '0.875rem' } },
            { value: 'normal', title: 'Normal', sample: 'A', style: { fontSize: '1rem' } },
            { value: 'large', title: 'Large', sample: 'A', style: { fontSize: '1.15rem' } },
            { value: 'xl', title: 'Extra large', sample: 'A', style: { fontSize: '1.3rem' } },
          ]}
        />
        <PrefGroup
          prefKey="spacing"
          icon="spacing"
          title={t('Line spacing')}
          selected={PREF_LABELS.spacing[prefs.spacing as 'normal' | 'relaxed']}
          options={[
            { value: 'normal', title: 'Normal', description: 'Standard space between lines' },
            {
              value: 'relaxed',
              title: 'Relaxed',
              description: 'More space between lines and words',
            },
          ]}
        />
        <PrefGroup
          prefKey="contrast"
          icon="contrast"
          title={t('Contrast')}
          selected={PREF_LABELS.contrast[prefs.contrast as 'standard' | 'high']}
          options={[
            { value: 'standard', title: 'Standard', description: 'Soft greys and borders' },
            {
              value: 'high',
              title: 'High contrast',
              description: 'Darker text, strong borders, underlined links',
            },
          ]}
        />
        <PrefGroup
          prefKey="highlight"
          icon="target"
          title={t('Highlight where I am')}
          help={t('Shows a thick yellow outline around the button, link or card you are on.')}
          selected={PREF_LABELS.highlight[prefs.highlight as 'off' | 'on']}
          options={[
            { value: 'off', title: 'Off' },
            { value: 'on', title: 'On' },
          ]}
        />
        <ReadAloudSection>
          <div className="row dp-actions">
            <Button variant="secondary" icon="refresh" onClick={resetPrefs}>
              {t('Reset to default')}
            </Button>
            <Button onClick={onClose}>{t('Done')}</Button>
          </div>
        </ReadAloudSection>
      </div>
    </>
  );
}

export function DisplayPanel() {
  const { panelOpen, setPanelOpen } = useDisplay();
  return panelOpen ? <DisplayDrawer onClose={() => setPanelOpen(false)} /> : null;
}
