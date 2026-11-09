import type { KeyboardEvent, MouseEvent } from 'react';
import { ChoiceField } from '../../components/ChoiceCards';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { areaPin, SchematicMap } from '../../components/SchematicMap';
import { formatKm } from '../../lib/format';
import { useLocations } from '../../student/queries';
import { StepSection, StepSections } from './StepSection';
import type { StepProps } from './stepProps';
import { t } from '../../i18n';

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
    <StepSections>
      <StepSection
        icon="pin"
        title={t('Neighbourhood')}
        intro={t('Only areas in the UR-CST pilot are listed.')}
      >
        <ChoiceField
          label={t('Neighbourhood')}
          required
          value={values.locationId ?? undefined}
          error={errors.locationId}
          options={locations.map(({ id, name, distanceKm }) => ({
            value: id,
            title: name,
            icon: 'pin' as const,
            description: `About ${formatKm(distanceKm)} from UR-CST`,
          }))}
          onChoose={(locationId) => change({ locationId })}
        />
      </StepSection>
      <StepSection
        icon="route"
        title={t('Finding the house')}
        intro={t('Directions students can follow on their first visit.')}
      >
        <div className="form-grid">
          <Field
            id="wz-landmark"
            label={t('Nearby landmark')}
            value={values.landmark}
            placeholder={t('e.g. Near Kiyovu roundabout')}
            required
            maxLength={120}
            error={errors.landmark}
            onChange={(landmark) => change({ landmark })}
          />
          <Field
            id="wz-address"
            label={t('Address or directions (optional)')}
            value={values.address}
            placeholder={t('e.g. KN 3 Ave, blue gate after the pharmacy')}
            maxLength={200}
            onChange={(address) => change({ address })}
          />
        </div>
      </StepSection>
      <StepSection
        icon="map"
        title={t('Map pin (optional)')}
        intro={t('Tap the map where the house is, or use the arrow keys to move the pin.')}
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="map map-pick overflow-hidden rounded-lg border border-line"
            aria-label={t('Place the map pin. Tap the map, or use the arrow keys to move the pin.')}
            onClick={placeFromClick}
            onKeyDown={nudge}
          >
            <SchematicMap locations={locations} area={location?.name} pin={values.pin} />
          </button>
          <p className="t-help m-0 flex flex-wrap items-center gap-2">
            {values.pin ? (
              <>
                <span className="inline-flex items-center gap-1 font-semibold text-green-text">
                  <Icon name="check" /> {t('Pin placed')}
                </span>
                <button type="button" className="link-btn" onClick={() => change({ pin: null })}>
                  {t('Remove pin')}
                </button>
              </>
            ) : (
              t('No pin yet. Students will see the centre of the neighbourhood.')
            )}
          </p>
        </div>
      </StepSection>
    </StepSections>
  );
}
