import type { LandlordInquiry } from '@urcst/shared';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { AvailabilityBadge, ReviewBadge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { InquiryBadge } from '../../components/InquiryBadge';
import { ErrorState, Skeleton } from '../../components/StateBlocks';
import { formatDate, initials } from '../../lib/format';
import { useLandlordSummary } from '../../landlord/queries';

const MORNING_ENDS = 12;
const AFTERNOON_ENDS = 18;

function greeting(hour: number) {
  if (hour < MORNING_ENDS) return 'Good morning';
  return hour < AFTERNOON_ENDS ? 'Good afternoon' : 'Good evening';
}

function Tile({
  label,
  value,
  icon,
  stripe,
}: {
  label: string;
  value: number;
  icon: IconName;
  stripe: string;
}) {
  return (
    <Link className="tile" to="/landlord/properties">
      <span className={`stripe ${stripe}`} />
      <span className="lab">
        <Icon name={icon} />
        {label}
      </span>
      <span className="val num">{value}</span>
    </Link>
  );
}

function InquiryRow({ inquiry }: { inquiry: LandlordInquiry }) {
  const { id, student, property, status, createdAt } = inquiry;

  return (
    <div className="mini">
      <span className="avatar sm">{initials(student)}</span>
      <div className="grow">
        <b>{student}</b>
        <div className="t-support">
          {property.title} · {formatDate(createdAt)}
        </div>
      </div>
      <InquiryBadge status={status} />
      <Link
        className={buttonClass({ variant: 'secondary', size: 'sm' })}
        to={`/landlord/inquiries?open=${id}`}
        aria-label={`Open the inquiry from ${student}`}
      >
        Open
      </Link>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isError, refetch } = useLandlordSummary();

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load your dashboard. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (!data) {
      return (
        <div className="stack" role="status" aria-busy="true" aria-label="Loading your dashboard">
          <Skeleton height={96} />
          <Skeleton height={240} />
        </div>
      );
    }
    return (
      <>
        <div className="tiles">
          <Tile label="Total properties" value={data.total} icon="building" stripe="stripe-blue" />
          <Tile label="Available" value={data.available} icon="check" stripe="stripe-green" />
          <Tile label="Occupied" value={data.occupied} icon="door" stripe="stripe-grey" />
          <Tile label="Pending review" value={data.pending} icon="clock" stripe="stripe-amber" />
        </div>
        <div className="tip dash-tip-wide">
          <Icon name="info" />
          <span>
            Keep availability up to date so students don&apos;t call about rooms that are already
            taken. Use &quot;Mark as occupied&quot; when a room is let.
          </span>
        </div>
        <div className="dash-grid">
          <section className="panel">
            <div className="row-between">
              <h2 className="t-section">Recent student inquiries</h2>
              <Link to="/landlord/inquiries">View all</Link>
            </div>
            {data.recentInquiries.length ? (
              data.recentInquiries.map((inquiry) => (
                <InquiryRow key={inquiry.id} inquiry={inquiry} />
              ))
            ) : (
              <p className="muted dash-empty">No inquiries yet.</p>
            )}
          </section>
          <section className="panel">
            <div className="row-between">
              <h2 className="t-section">Your properties</h2>
              <Link to="/landlord/properties">Manage</Link>
            </div>
            {data.properties.length ? (
              data.properties.map(({ id, title, coverUrl, availability, reviewStatus }) => (
                <div className="mini" key={id}>
                  {coverUrl && <img src={coverUrl} alt="" />}
                  <div className="grow">
                    <b>{title || 'Untitled listing'}</b>
                    <div className="status-pair">
                      {reviewStatus !== 'DRAFT' && (
                        <AvailabilityBadge availability={availability} />
                      )}
                      <ReviewBadge status={reviewStatus} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted dash-empty">
                Add your first accommodation to start receiving inquiries.
              </p>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">
            {greeting(new Date().getHours())}, {user?.fullName}
          </h1>
          <p className="muted">Here is what is happening with your accommodation.</p>
        </div>
        <Link className={buttonClass({ size: 'lg' })} to="/landlord/properties/new">
          <Icon name="plus" />
          Add accommodation
        </Link>
      </div>
      {content()}
    </main>
  );
}
