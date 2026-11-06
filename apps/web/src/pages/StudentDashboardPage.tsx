import type { StudentInquiry } from '@urcst/shared';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Badge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { MiniProperty } from '../components/MiniProperty';
import { ErrorState } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { useSaved } from '../student/SavedProvider';
import { useInquiries, usePropertiesByIds } from '../student/queries';
import { useHistoryData, useRunSearch } from '../student/useHistory';

const PREVIEW_COUNT = 3;
const MESSAGE_PREVIEW = 80;

function InquiryRow({ inquiry }: { inquiry: StudentInquiry }) {
  const { property, lastMessage, replied } = inquiry;
  const { body, fromLandlord } = lastMessage;
  const preview = body.length > MESSAGE_PREVIEW ? `${body.slice(0, MESSAGE_PREVIEW)}…` : body;

  return (
    <div className="mini">
      {property.coverUrl && <img src={property.coverUrl} alt="" />}
      <div className="grow">
        <Link className="t" to={`/properties/${property.id}`}>
          {property.title}
        </Link>
        <div className="t-support">
          {fromLandlord ? 'Landlord: ' : 'You: '}
          {preview}
        </div>
      </div>
      {replied ? (
        <Badge tone="available" icon="check">
          Replied
        </Badge>
      ) : (
        <Badge tone="pending" icon="clock">
          Awaiting reply
        </Badge>
      )}
    </div>
  );
}

function SavedPanel() {
  const saved = useSaved();
  const { items } = usePropertiesByIds(saved.ids.slice(0, PREVIEW_COUNT));

  return (
    <section className="panel">
      <div className="row-between">
        <h2 className="t-section">
          Saved properties <span className="count-pill">{saved.ids.length}</span>
        </h2>
        <Link to="/saved">View all</Link>
      </div>
      {items.length ? (
        items.map((property) => <MiniProperty key={property.id} property={property} />)
      ) : (
        <p className="muted">No saved properties yet. Tap the heart on a listing to save it.</p>
      )}
    </section>
  );
}

function InquiriesPanel() {
  const { data, isError, refetch } = useInquiries();

  return (
    <section className="panel">
      <h2 className="t-section">My inquiries</h2>
      {isError ? (
        <ErrorState
          icon="wifi"
          title="Unable to load your inquiries."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      ) : data?.length ? (
        data.map((inquiry) => <InquiryRow key={inquiry.id} inquiry={inquiry} />)
      ) : (
        <p className="muted">Messages you send to landlords will appear here.</p>
      )}
    </section>
  );
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const { views, searches } = useHistoryData();
  const runSearch = useRunSearch();
  const toast = useToast();

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Welcome back, {user?.fullName}</h1>
          <p className="muted">Pick up where you left off.</p>
        </div>
        <Link className={buttonClass()} to="/search">
          <Icon name="search" />
          Find accommodation
        </Link>
      </div>
      <div className="dash-grid">
        <SavedPanel />
        <section className="panel">
          <div className="row-between">
            <h2 className="t-section">Recently viewed</h2>
            <Link to="/history">View history</Link>
          </div>
          {views.length ? (
            views
              .slice(0, PREVIEW_COUNT)
              .map((property) => <MiniProperty key={property.id} property={property} />)
          ) : (
            <p className="muted">Nothing viewed yet.</p>
          )}
        </section>
        <InquiriesPanel />
        <section className="panel">
          <div className="row-between">
            <h2 className="t-section">Recent searches</h2>
            <Link to="/history" aria-label="All recent searches">
              All
            </Link>
          </div>
          {searches.length ? (
            searches.slice(0, PREVIEW_COUNT).map((search) => (
              <div className="mini" key={search.key}>
                <span className="avatar sm">
                  <Icon name="search" />
                </span>
                <div className="grow">
                  <b>{search.label}</b>
                  <div className="t-support">{search.when}</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Re-run ${search.label}`}
                  onClick={() => {
                    runSearch(search.filters);
                    toast(`Search re-run: ${search.label}`);
                  }}
                >
                  Re-run
                </Button>
              </div>
            ))
          ) : (
            <p className="muted">No searches yet.</p>
          )}
          <div className="tip dash-tip">
            <Icon name="bell" />
            <span>
              <b>Housing alerts</b> (planned enhancement): get notified when a matching room is
              listed. Not available in this pilot.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
