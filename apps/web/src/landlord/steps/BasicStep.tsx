import type { RoomType } from '@urcst/shared';
import { ChoiceField } from '../../components/ChoiceCards';
import { Field } from '../../components/Field';
import type { IconName } from '../../components/Icon';
import { PickGroup } from '../../components/PickGroup';
import type { StepProps } from './stepProps';

const TYPES: { value: RoomType; title: string; icon: IconName; description: string }[] = [
  { value: 'SINGLE', title: 'Single room', icon: 'bed', description: 'One person, own room' },
  { value: 'SHARED', title: 'Shared room', icon: 'users', description: 'Two or more people share' },
  { value: 'STUDIO', title: 'Studio', icon: 'door', description: 'One room with kitchen corner' },
  { value: 'APARTMENT', title: 'Apartment', icon: 'building', description: 'Two or more rooms' },
];

const ROOMS = [
  { value: '1', label: '1 room' },
  { value: '2', label: '2 rooms' },
  { value: '3', label: '3 rooms' },
  { value: '4', label: '4 rooms' },
  { value: '5', label: '5 or more' },
];

export function BasicStep({ values, errors, change }: StepProps) {
  return (
    <div className="form-grid">
      <div className="full">
        <Field
          id="wz-title"
          label="Property title"
          value={values.title}
          placeholder="e.g. Kiyovu Garden Single Room"
          required
          maxLength={120}
          error={errors.title}
          help="Include the neighbourhood and room type."
          onChange={(title) => change({ title })}
        />
      </div>
      <div className="full">
        <ChoiceField
          label="Accommodation type"
          required
          value={values.type ?? undefined}
          options={TYPES}
          error={errors.type}
          onChoose={(type) => change({ type })}
        />
      </div>
      <div className="full">
        <PickGroup
          label="Number of rooms"
          value={String(Math.min(values.rooms, 5))}
          options={ROOMS}
          error={errors.rooms}
          onChange={(rooms) => change({ rooms: Number(rooms) })}
        />
      </div>
      <div className="full">
        <Field
          id="wz-desc"
          label="Description"
          rows={5}
          value={values.description}
          placeholder="e.g. A bright single room in a quiet compound. Water and electricity included. 10 minutes' walk to campus."
          required
          maxLength={2000}
          error={errors.description}
          help="Describe the room, what is included, and any house rules."
          onChange={(description) => change({ description })}
        />
      </div>
    </div>
  );
}
