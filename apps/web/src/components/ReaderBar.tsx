import { useDisplay } from '../display/DisplayProvider';
import { PREF_LABELS } from '../display/prefs';
import { useRovingRadio } from '../lib/useRovingRadio';
import { useReader } from '../reader/useReader';
import { Icon } from './Icon';
import { t, tNode } from '../i18n';

const SNIPPET_LENGTH = 70;

export function ReaderBar() {
  const reader = useReader();
  const { prefs, setPref } = useDisplay();
  const rates = Object.entries(PREF_LABELS.rate);
  const radio = useRovingRadio(
    rates.map(([value]) => value),
    prefs.rate,
    (value) => setPref('rate', value),
  );

  if (!reader.active) return null;

  const text = reader.text.replace(/\s+/g, ' ');
  const snippet = text.slice(0, SNIPPET_LENGTH);

  return (
    <div className="reader" role="region" aria-label={t('Read aloud player')}>
      <span className="reader-info">
        <Icon name="volume" />
        <span>
          <b>{tNode(reader.label)}</b> {t('· part')} {reader.index + 1} {t('of')} {reader.total}
          <span className="reader-snip">
            {tNode(snippet)}
            {text.length > SNIPPET_LENGTH ? '…' : ''}
          </span>
        </span>
      </span>
      <span className="reader-ctl">
        <button
          type="button"
          aria-label={t('Previous part')}
          disabled={reader.index === 0}
          onClick={() => reader.step(-1)}
        >
          <Icon name="skipB" />
        </button>
        <button
          type="button"
          className="big"
          aria-label={reader.paused ? t('Resume') : t('Pause')}
          onClick={reader.paused ? reader.resume : reader.pause}
        >
          <Icon name={reader.paused ? 'play' : 'pause'} />
        </button>
        <button
          type="button"
          aria-label={t('Next part')}
          disabled={reader.index >= reader.total - 1}
          onClick={() => reader.step(1)}
        >
          <Icon name="skipF" />
        </button>
        <button type="button" aria-label={t('Stop reading')} onClick={reader.stop}>
          <Icon name="stop" />
        </button>
      </span>
      <span className="reader-speed" role="radiogroup" aria-label={t('Reading speed')}>
        {rates.map(([value, label]) => (
          <button key={value} {...radio(value)}>
            {tNode(label)}
          </button>
        ))}
      </span>
    </div>
  );
}
