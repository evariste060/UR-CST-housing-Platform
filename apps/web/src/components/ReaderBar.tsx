import { useDisplay } from '../display/DisplayProvider';
import { PREF_LABELS } from '../display/prefs';
import { useRovingRadio } from '../lib/useRovingRadio';
import { useReader } from '../reader/useReader';
import { Icon } from './Icon';

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
    <div className="reader" role="region" aria-label="Read aloud player">
      <span className="reader-info">
        <Icon name="volume" />
        <span>
          <b>{reader.label}</b> · part {reader.index + 1} of {reader.total}
          <span className="reader-snip">
            {snippet}
            {text.length > SNIPPET_LENGTH ? '…' : ''}
          </span>
        </span>
      </span>
      <span className="reader-ctl">
        <button
          type="button"
          aria-label="Previous part"
          disabled={reader.index === 0}
          onClick={() => reader.step(-1)}
        >
          <Icon name="skipB" />
        </button>
        <button
          type="button"
          className="big"
          aria-label={reader.paused ? 'Resume' : 'Pause'}
          onClick={reader.paused ? reader.resume : reader.pause}
        >
          <Icon name={reader.paused ? 'play' : 'pause'} />
        </button>
        <button
          type="button"
          aria-label="Next part"
          disabled={reader.index >= reader.total - 1}
          onClick={() => reader.step(1)}
        >
          <Icon name="skipF" />
        </button>
        <button type="button" aria-label="Stop reading" onClick={reader.stop}>
          <Icon name="stop" />
        </button>
      </span>
      <span className="reader-speed" role="radiogroup" aria-label="Reading speed">
        {rates.map(([value, label]) => (
          <button key={value} {...radio(value)}>
            {label}
          </button>
        ))}
      </span>
    </div>
  );
}
