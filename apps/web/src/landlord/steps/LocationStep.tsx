import type { KeyboardEvent, MouseEvent } from 'react';
import { ChoiceField } from '../../components/ChoiceCards';
import { Field } from '../../components/Field';
import { areaPin, SchematicMap } from '../../components/SchematicMap';
import { formatKm } from '../../lib/format';
import { useLocations } from '../../student/queries';
import type { StepProps } from './stepProps';

const NUDGE = 0.02;
const NUDGES: Record<string, [number, number]> = {
  ArrowLeft: [-NUDGE, 0],
  ArrowRight: [NUDGE, 0],
  ArrowUp: [0, -NUDGE],
  ArrowDown: [0, NUDGE],
};
const CENTRE = { x: 0.5, y: 0.5 };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function LocationStep({ values, errors, change }: StepProps) {
  const { data: locations = [] } = useLocations();
  const location = locations.find(({ id }) => id === values.locationId);
  const startFrom = values.pin ?? (location ? areaPin(location) : CENTRE);

  function placeFromClick(event: MouseEvent<HTMLButtonElement>) {
    // A click made with Enter or Space has no position, so it places the pin where it would show.
    if (event.detail === 0) {
      change({ pin: startFrom });
      return;
    }
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    change({ pin: { x: (event.clientX - left) / width, y: (event.clientY - top) / height } });
  }

  function nudge(event: KeyboardEvent) {
    const move = NUDGES[event.key];
    if (!move) return;
    event.preventDefault();
    change({ pin: { x: clamp(startFrom.x + move[0]), y: clamp(startFrom.y + move[1]) } });
  }

  return (
    <div className="form-grid">
      <div className="full">
        <ChoiceField
          label="Neighbourhood"
          required
          value={values.locationId ?? undefined}
          help="Only areas in the UR-CST pilot are listed."
          error={errors.locationId}
          options={locations.map(({ id, name, distanceKm }) => ({
            value: id,
            title: name,
            icon: 'pin' as const,
            description: `About ${formatKm(distanceKm)} from UR-CST`,
          }))}
          onChoose={(locationId) => change({ locationId })}
        />
      </div>
      <Field
        id="wz-landmark"
        label="Nearby landmark"
        value={values.landmark}
        placeholder="e.g. Near Kiyovu roundabout"
        required
        maxLength={120}
        error={errors.landmark}
        onChange={(landmark) => change({ landmark })}
      />
      <div className="full">
        <Field
          id="wz-address"
          label="Address or directions (optional)"
          value={values.address}
          placeholder="e.g. KN 3 Ave, blue gate after the pharmacy"
          maxLength={200}
          onChange={(address) => change({ address })}
        />
      </div>
      <div className="full field">
        <span className="label">Map pin (optional)</span>
        <p className="t-help">
          Tap the map to place the pin where the house is.{' '}
          {values.pin && (
            <button type="button" className="link-btn" onClick={() => change({ pin: null })}>
              Remove pin
            </button>
          )}
        </p>
        <button
          type="button"
          className="map map-pick"
          aria-label="Place the map pin. Tap the map, or use the arrow keys to move the pin."
          onClick={placeFromClick}
          onKeyDown={nudge}
        >
          <SchematicMap locations={locations} area={location?.name} pin={values.pin} />
        </button>
      </div>
    </div>
  );
}
