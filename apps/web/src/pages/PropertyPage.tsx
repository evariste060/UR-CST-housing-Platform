import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, buttonClass } from '../components/Button';
import { PropertyBody } from '../components/PropertyBody';
import { EmptyState, ErrorState, Skeleton } from '../components/StateBlocks';
import { ApiError } from '../lib/api';
import { useProperty } from '../student/queries';
import { rememberView } from '../student/useHistory';

export function ListingUnavailable() {
  return (
    <EmptyState
      icon="home"
      title="This listing is not available"
      text="It may have been removed or is still waiting for review."
      actions={
        <Link className={buttonClass()} to="/search">
          Back to search
        </Link>
      }
    />
  );
}

export function PropertyLoading() {
  return (
    <div className="stack" role="status" aria-busy="true" aria-label="Loading this listing">
      <Skeleton height={36} width="60%" />
      <Skeleton height={320} />
      <Skeleton height={160} />
    </div>
  );
}

export function PropertyPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: property, isPending, isError, error, refetch } = useProperty(id);
  const approved = property?.reviewStatus === 'APPROVED';

  useEffect(() => {
    // For students the server records the view.
    if (approved && user?.role !== 'STUDENT') rememberView(id);
  }, [approved, id, user?.role]);

  useEffect(() => {
    if (property) document.title = `${property.title} · UR-CST Student Housing`;
  }, [property]);

  function content() {
    if (isPending) return <PropertyLoading />;
    if (isError) {
      if (error instanceof ApiError && error.status === 404) return <ListingUnavailable />;
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load this listing. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    return <PropertyBody property={property} />;
  }

  return (
    <main className={approved ? 'page has-sticky' : 'page'} id="main">
      {/* Gives focus a page title to land on while the listing loads. */}
      {(isPending || isError) && <h1 className="sr-only">Property details</h1>}
      {content()}
    </main>
  );
}
