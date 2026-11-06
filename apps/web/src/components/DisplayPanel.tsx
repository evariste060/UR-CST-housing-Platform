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
          <Icon name={icon} /> {title}
        </h3>
        <span className="picked">
          Selected: <b>{selected}</b>
        </span>
      </div>
      {help && <p className="t-help dp-help">{help}</p>}
      <div className="dp-grid" role="radiogroup" aria-labelledby={headingId}>
        {options.map(({ value, title: cardTitle, sample, description, style }) => (
          <button key={value} className="choice dcard" {...radio(value)}>
            {sample && (
              <span className="dsample" style={style}>
                {sample}
              </span>
            )}
            <span>
              <b style={style}>{cardTitle}</b>
              {description && <span className="t-support choice-text">{description}</span>}
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
        {title}
      </span>
      <span className="picked">
        Selected: <b>{selected}</b>
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
          <Icon name="volume" /> Read aloud
        </h3>
        {!reader.supported && (
          <span className="badge b-pending">Not supported in this browser</span>
        )}
      </div>
      <p className="t-help dp-help">
        For people who prefer listening. The voice comes from your device.
      </p>
      <Button block icon="volume" onClick={() => reader.start(pageLabel(pathname, user?.role))}>
        Listen to this page
      </Button>

      <SubHeading
        id="dph-rate"
        title="Reading speed"
        selected={PREF_LABELS.rate[prefs.rate as keyof typeof PREF_LABELS.rate]}
      />
      <div className="chipset" role="radiogroup" aria-labelledby="dph-rate">
        {rates.map(([value, label]) => (
          <button key={value} className="pchip" {...rateRadio(value)}>
            {prefs.rate === value && <Icon name="check" />}
            {label}
          </button>
        ))}
      </div>

      <SubHeading
        id="dph-click"
        title="Read what I tap"
        selected={PREF_LABELS.clickRead[prefs.clickRead as 'off' | 'on']}
      />
      <p className="t-help dp-help">
        When on, tap any text on the page to hear it. Buttons and links still work.
      </p>
      <div className="dp-grid" role="radiogroup" aria-labelledby="dph-click">
        <button className="choice dcard" {...clickRadio('off')}>
          <span>
            <b>Off</b>
          </span>
        </button>
        <button className="choice dcard" {...clickRadio('on')}>
          <span>
            <b>On</b>
            <span className="t-support choice-text">Tap text to listen</span>
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
            Display &amp; audio
          </h2>
          <button
            ref={close}
            type="button"
            className="icon-btn"
            aria-label="Close display settings"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <p className="muted dp-intro">
          Make the platform comfortable for you. Changes apply straight away and are remembered on
          this device.
        </p>
        <div className="dp-preview" aria-hidden="true">
          <span className="badge b-available dp-preview-badge">
            <Icon name="check" />
            Available
          </span>
          <p className="t-price num dp-preview-price">
            85,000 RWF <span className="t-support">/ month</span>
          </p>
          <p className="dp-preview-distance">
            <Icon name="pin" /> 0.8 km from UR-CST
          </p>
          <p className="muted">
            A bright single room in a quiet compound. Water and electricity included.
          </p>
        </div>

        <PrefGroup
          prefKey="font"
          icon="text"
          title="Font style"
          help="Pick the letters that are easiest for you to read."
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
          title="Light or dark"
          help="Dark mode is easier on the eyes at night."
          selected={PREF_LABELS.theme[prefs.theme as 'light' | 'dark']}
          options={[
            { value: 'light', title: 'Light', description: 'Dark text on light background' },
            { value: 'dark', title: 'Dark', description: 'Light text on dark background' },
          ]}
        />
        <PrefGroup
          prefKey="size"
          icon="text"
          title="Text size"
          selected={PREF_LABELS.size[prefs.size as keyof typeof PREF_LABELS.size]}
          options={[
            { value: 'normal', title: 'Normal', sample: 'A', style: { fontSize: '1rem' } },
            { value: 'large', title: 'Large', sample: 'A', style: { fontSize: '1.15rem' } },
            { value: 'xl', title: 'Extra large', sample: 'A', style: { fontSize: '1.3rem' } },
          ]}
        />
        <PrefGroup
          prefKey="spacing"
          icon="spacing"
          title="Line spacing"
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
          title="Contrast"
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
          title="Highlight where I am"
          help="Shows a thick yellow outline around the button, link or card you are on."
          selected={PREF_LABELS.highlight[prefs.highlight as 'off' | 'on']}
          options={[
            { value: 'off', title: 'Off' },
            { value: 'on', title: 'On' },
          ]}
        />
        <ReadAloudSection>
          <div className="row dp-actions">
            <Button variant="secondary" icon="refresh" onClick={resetPrefs}>
              Reset to default
            </Button>
            <Button onClick={onClose}>Done</Button>
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
