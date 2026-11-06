import type { LocationDto, PropertyDetail, ListingForm } from '@urcst/shared';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PropertyBody } from '../../components/PropertyBody';
import { EmptyState } from '../../components/StateBlocks';
import { useListing } from '../../landlord/queries';
import { SubmitButton } from '../../landlord/SubmitButton';
import { useLocations } from '../../student/queries';

/** The saved answers, shaped like the listing students would see. */
function toPreview(form: ListingForm, locations: LocationDto[], landlord: string): PropertyDetail {
  const { values, photos, coverId } = form;
  const location = locations.find(({ id }) => id === values.locationId);
  const distanceKm = location?.distanceKm ?? 0;

  return {
    id: form.id,
    title: values.title || 'Untitled listing',
    type: values.type ?? 'SINGLE',
    rooms: values.rooms,
    area: location?.name ?? '-',
    landmark: values.landmark || '-',
    distanceKm,
    rentRwf: values.rentRwf ?? 0,
    water: values.water,
    electricity: values.electricity,
    bathroom: values.bathroom,
    security: values.security,
    selfContained: values.selfContained,
    availability: values.availability,
    coverUrl: photos.find(({ id }) => id === coverId)?.url ?? null,
    description: values.description || 'No description yet.',
    address: values.address || null,
    // A preview is never the live listing, so its student buttons stay off.
    reviewStatus: 'DRAFT',
    areaDistanceKm: distanceKm,
    pin: values.pin,
    photos,
    landlord: { name: landlord, phone: null, whatsapp: null, inApp: false },
  };
}

export function PreviewPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: form, isPending } = useListing(id);
  const { data: locations = [] } = useLocations();

  if (!form) {
    return (
      <main className="page" id="main">
        <h1 className="sr-only">Preview</h1>
        {!isPending && (
          <EmptyState
            icon="eye"
            title="Nothing to preview"
            text="Start adding a property first."
            actions={
              <Link className={buttonClass()} to="/landlord/properties/new">
                Add accommodation
              </Link>
            }
          />
        )}
      </main>
    );
  }

  return (
    <main className="page" id="main">
      <div className="notice warn preview-notice">
        <Icon name="eye" />
        <span>
          <b>Preview.</b> This is how students will see your listing. It is not visible to students
          yet.
        </span>
      </div>
      <PropertyBody
        property={toPreview(form, locations, user?.fullName ?? '')}
        actions={
          <>
            <Link
              className={buttonClass({ variant: 'secondary' })}
              to={`/landlord/properties/${id}/edit?step=5`}
            >
              <Icon name="edit" />
              Return to editing
            </Link>
            <SubmitButton
              id={id}
              values={form.values}
              photoCount={form.photos.length}
              label="Submit for review"
            />
          </>
        }
      />
    </main>
  );
}
