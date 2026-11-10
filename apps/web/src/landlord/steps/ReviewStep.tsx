import { ROOM_TYPE_LABELS, type ListingDraft, type WizardPhoto } from '@urcst/shared';
import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { formatRwf, layoutLabel } from '../../lib/format';
import { SHOW_MAP_PIN } from './LocationStep';
import { useLocations } from '../../student/queries';
import { t, tNode } from '../../i18n';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

interface ReviewStepProps {
  values: ListingDraft;
  photos: WizardPhoto[];
  isEdit: boolean;
  onEdit: (step: number) => void;
}

function Section({
  title,
  icon,
  step,
  onEdit,
  children,
}: {
  title: string;
  icon: IconName;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <h3 className="m-0 flex items-center gap-2 text-base font-semibold">
          <span className="text-blue-700">
            <Icon name={icon} />
          </span>
          {tNode(title)}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          icon="edit"
          aria-label={t('Edit {title}', { title })}
          onClick={() => onEdit(step)}
        >
          {t('Edit')}
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Label and answer pairs, two columns where there is room. */
function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 max-phone:grid-cols-1">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-sm text-muted">{tNode(label)}</dt>
          <dd className="m-0 font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReviewStep({ values, photos, isEdit, onEdit }: ReviewStepProps) {
  const { data: locations = [] } = useLocations();
  const area = locations.find(({ id }) => id === values.locationId)?.name ?? '-';

  return (
    <div className="flex flex-col gap-4">
      <Section title={t('Basic information')} icon="home" step={1} onEdit={onEdit}>
        <Facts
          items={[
            ['Title', values.title],
            ['Type', values.type ? ROOM_TYPE_LABELS[values.type] : '-'],
            ['Rooms', values.rooms],
          ]}
        />
        <p className="mt-3 mb-0 whitespace-pre-wrap text-muted">{tNode(values.description)}</p>
      </Section>
      <Section title={t('Location')} icon="pin" step={2} onEdit={onEdit}>
        <Facts
          items={[
            ['Neighbourhood', area],
            ['Landmark', values.landmark],
            ['Address or directions', values.address || 'Not given'],
            ...(SHOW_MAP_PIN
              ? [['Map pin', values.pin ? 'Placed' : 'Neighbourhood centre'] as [string, ReactNode]]
              : []),
          ]}
        />
      </Section>
      <Section title={t('Rent & facilities')} icon="coins" step={3} onEdit={onEdit}>
        <Facts
          items={[
            ['Monthly rent', <span className="num">{formatRwf(values.rentRwf ?? 0)}</span>],
            ['Availability', values.availability === 'AVAILABLE' ? 'Available' : 'Occupied'],
            ['Water / electricity', `${yesNo(values.water)} / ${yesNo(values.electricity)}`],
            ['Bathroom', values.bathroom === 'PRIVATE' ? 'Private' : 'Shared'],
            ['Security', yesNo(values.security)],
            ['Facilities', layoutLabel(values)],
          ]}
        />
      </Section>
      <Section
        title={t('Photos ({length})', { length: photos.length })}
        icon="image"
        step={4}
        onEdit={onEdit}
      >
        <div className="flex flex-wrap gap-2">
          {photos.map(({ id, url }) => (
            <img
              key={id}
              className="h-20 w-28 rounded-md border border-line object-cover"
              src={url}
              alt=""
            />
          ))}
        </div>
      </Section>
      <div className="notice">
        <Icon name="info" />
        <span>
          {t(
            'After you submit, an administrator checks the listing. Students can see it only after it is approved.',
          )}
          {isEdit && t(' Edited listings are checked again.')}
        </span>
      </div>
    </div>
  );
}
