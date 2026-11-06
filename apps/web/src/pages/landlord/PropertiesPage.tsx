import { useQueryClient } from '@tanstack/react-query';
import {
  landlordFilterSchema,
  type Availability,
  type LandlordFilter,
  type LandlordProperty,
} from '@urcst/shared';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AvailabilityBadge, ReviewBadge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import { formatKm, formatRwf } from '../../lib/format';
import { LANDLORD_KEY, useLandlordProperties } from '../../landlord/queries';
import { forgetDraftId, readDraftId } from '../../landlord/useDraft';

const FILTERS: { value: LandlordFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'pending', label: 'Pending review' },
];

const PLACEHOLDER_TITLE = 'Untitled listing';

function useListingActions() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });

  async function attempt(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
      return true;
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      return false;
    }
  }

  return {
    async setAvailability({ id, title, availability }: LandlordProperty, next: Availability) {
      const changed = await attempt(() => api.setAvailability(id, next));
      if (!changed) return;
      toast(
        `Availability updated successfully. ${title} is now ${next === 'OCCUPIED' ? 'occupied' : 'available'}.`,
        {
          undo: () =>
            void attempt(() => api.setAvailability(id, availability)).then(
              (undone) => undone && toast('Change undone.'),
            ),
        },
      );
    },

    async remove({ id }: LandlordProperty) {
      if (!(await attempt(() => api.deleteListing(id)))) return;
      if (readDraftId() === id) forgetDraftId();
      toast('Listing deleted.', {
        undo: () =>
          void attempt(() => api.restoreListing(id)).then(
            (restored) => restored && toast('Listing restored.'),
          ),
      });
    },
  };
}

function PropertyRow({
  property,
  onToggle,
  onDelete,
}: {
  property: LandlordProperty;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { id, rentRwf, area, distanceKm, availability, reviewStatus, reviewNote, coverUrl } =
    property;
  const title = property.title || PLACEHOLDER_TITLE;
  const isDraft = reviewStatus === 'DRAFT';
  const removed = reviewStatus === 'REMOVED';
  const occupied = availability === 'OCCUPIED';
  const edit = `/landlord/properties/${id}/edit`;
  const view =
    reviewStatus === 'APPROVED' ? `/properties/${id}` : `/landlord/properties/${id}/preview`;

  return (
    <div className="list-item">
      {coverUrl && <img className="thumb" src={coverUrl} alt="" />}
      <div className="grow">
        <b className="t-card">{title}</b>
        {area && rentRwf !== null && distanceKm !== null && (
          <p className="num landlord-line">
            <b>{formatRwf(rentRwf)}</b>{' '}
            <span className="muted">
              / month · {area} · {formatKm(distanceKm)}
            </span>
          </p>
        )}
        <div className="status-pair">
          {!isDraft && (
            <span>
              <span className="k">Room availability</span>
              <AvailabilityBadge availability={availability} />
            </span>
          )}
          <span>
            <span className="k">Listing status</span>
            <ReviewBadge status={reviewStatus} />
          </span>
        </div>
        {reviewNote && (
          <p className="t-help landlord-note">
            <Icon name="info" /> Admin note: {reviewNote}
          </p>
        )}
        {!isDraft && property.hasUnsubmittedChanges && (
          <p className="t-help landlord-note">
            <Icon name="info" /> You have changes that have not been submitted. Students still see
            the last approved version.
          </p>
        )}
      </div>
      <div className="acts">
        {isDraft ? (
          <Link
            className={buttonClass({ size: 'sm' })}
            to={edit}
            aria-label={`Continue with ${title}`}
          >
            <Icon name="edit" />
            Continue
          </Link>
        ) : (
          <>
            <Link
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
              to={view}
              aria-label={`View ${title}`}
            >
              <Icon name="eye" />
              View
            </Link>
            {!removed && (
              <>
                <Link
                  className={buttonClass({ variant: 'secondary', size: 'sm' })}
                  to={edit}
                  aria-label={`Edit ${title}`}
                >
                  <Icon name="edit" />
                  Edit
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={occupied ? 'check' : 'door'}
                  aria-label={`Mark as ${occupied ? 'available' : 'occupied'}: ${title}`}
                  onClick={onToggle}
                >
                  Mark as {occupied ? 'available' : 'occupied'}
                </Button>
              </>
            )}
          </>
        )}
        <Button
          variant="danger-outline"
          size="sm"
          icon="trash"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const parsed = landlordFilterSchema.safeParse(params.get('filter'));
  const filter = parsed.success ? parsed.data : 'all';
  const list = useLandlordProperties(filter);
  const actions = useListingActions();
  const [deleting, setDeleting] = useState<LandlordProperty | null>(null);
  const pages = list.data?.pages;
  const items = pages?.flatMap((page) => page.items) ?? [];
  const counts = pages?.[0]?.counts;

  function content() {
    if (list.isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load your properties. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void list.refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (!pages) {
      return (
        <div className="stack" role="status" aria-busy="true" aria-label="Loading your properties">
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon="building"
          title="No properties here"
          text={
            filter === 'all'
              ? 'Add your first accommodation to start receiving inquiries.'
              : 'No properties match this filter.'
          }
          actions={
            <Link className={buttonClass()} to="/landlord/properties/new">
              <Icon name="plus" />
              Add accommodation
            </Link>
          }
        />
      );
    }
    return (
      <>
        <div className="list">
          {items.map((property) => (
            <PropertyRow
              key={property.id}
              property={property}
              onToggle={() =>
                void actions.setAvailability(
                  property,
                  property.availability === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE',
                )
              }
              onDelete={() => setDeleting(property)}
            />
          ))}
        </div>
        {list.hasNextPage && (
          <div className="show-more">
            <Button
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Show more
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">My properties</h1>
          <p className="muted">Room availability and listing approval are shown separately.</p>
        </div>
        <Link className={buttonClass()} to="/landlord/properties/new">
          <Icon name="plus" />
          Add accommodation
        </Link>
      </div>
      <div className="seg landlord-tabs" role="group" aria-label="Filter properties">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setParams(value === 'all' ? {} : { filter: value }, { replace: true })}
          >
            {label} {counts && <span className="num">({counts[value]})</span>}
          </button>
        ))}
      </div>
      {content()}
      {deleting && (
        <ConfirmDialog
          title="Are you sure you want to delete this listing?"
          body={`"${deleting.title || PLACEHOLDER_TITLE}" will be removed from your properties and students will no longer see it.`}
          confirm="Delete listing"
          tone="danger"
          icon="trash"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setDeleting(null);
            void actions.remove(deleting);
          }}
        />
      )}
    </main>
  );
}
