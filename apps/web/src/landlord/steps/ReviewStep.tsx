import { ROOM_TYPE_LABELS, type ListingDraft, type WizardPhoto } from '@urcst/shared';
import type { ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { formatRwf, layoutLabel } from '../../lib/format';
import { useLocations } from '../../student/queries';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

interface ReviewStepProps {
  values: ListingDraft;
  photos: WizardPhoto[];
  isEdit: boolean;
  onEdit: (step: number) => void;
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="review-sec">
      <h3>
        {title}
        <Button
          variant="ghost"
          size="sm"
          icon="edit"
          aria-label={`Edit ${title}`}
          onClick={() => onEdit(step)}
        >
          Edit
        </Button>
      </h3>
      <div className="review-body">{children}</div>
    </div>
  );
}

export function ReviewStep({ values, photos, isEdit, onEdit }: ReviewStepProps) {
  const { data: locations = [] } = useLocations();
  const area = locations.find(({ id }) => id === values.locationId)?.name ?? '-';

  return (
    <div className="stack">
      <Section title="Basic information" step={1} onEdit={onEdit}>
        <dl className="kv">
          <dt>Title</dt>
          <dd>{values.title}</dd>
          <dt>Type</dt>
          <dd>{values.type ? ROOM_TYPE_LABELS[values.type] : '-'}</dd>
          <dt>Rooms</dt>
          <dd>{values.rooms}</dd>
        </dl>
        <p className="muted review-text">{values.description}</p>
      </Section>
      <Section title="Location" step={2} onEdit={onEdit}>
        <dl className="kv">
          <dt>Neighbourhood</dt>
          <dd>{area}</dd>
          <dt>Landmark</dt>
          <dd>{values.landmark}</dd>
          <dt>Map pin</dt>
          <dd>{values.pin ? 'Placed' : 'Neighbourhood centre'}</dd>
        </dl>
      </Section>
      <Section title="Rent & facilities" step={3} onEdit={onEdit}>
        <dl className="kv">
          <dt>Monthly rent</dt>
          <dd className="num">{formatRwf(values.rentRwf ?? 0)}</dd>
          <dt>Availability</dt>
          <dd>{values.availability === 'AVAILABLE' ? 'Available' : 'Occupied'}</dd>
          <dt>Water / electricity</dt>
          <dd>
            {yesNo(values.water)} / {yesNo(values.electricity)}
          </dd>
          <dt>Bathroom</dt>
          <dd>{values.bathroom === 'PRIVATE' ? 'Private' : 'Shared'}</dd>
          <dt>Security</dt>
          <dd>{yesNo(values.security)}</dd>
          <dt>Facilities</dt>
          <dd>{layoutLabel(values)}</dd>
        </dl>
      </Section>
      <Section title={`Photos (${photos.length})`} step={4} onEdit={onEdit}>
        <div className="row">
          {photos.map(({ id, url }) => (
            <img key={id} className="review-photo" src={url} alt="" />
          ))}
        </div>
      </Section>
      <div className="notice">
        <Icon name="info" />
        <span>
          After you submit, an administrator checks the listing. Students can see it only after it
          is approved.{isEdit && ' Edited listings are checked again.'}
        </span>
      </div>
    </div>
  );
}
