import { ROOM_TYPE_LABELS, type PropertyDetail } from '@urcst/shared';
import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AvailabilityBadge, ReviewBadge } from './Badge';
import { Button, buttonClass } from './Button';
import { Gallery } from './Gallery';
import { Icon, type IconName } from './Icon';
import { OnThisPage, type OnThisPageItem } from './OnThisPage';
import { ReportDialog } from './ReportDialog';
import { SchematicMap } from './SchematicMap';
import {
  formatRwf,
  initials,
  layoutLabel,
  spokenSummary,
  typeLabel,
  formatKm,
} from '../lib/format';
import { useReader } from '../reader/useReader';
import { useCompare } from '../student/CompareProvider';
import { useSaved } from '../student/SavedProvider';
import { useLocations } from '../student/queries';

const LONG_DESCRIPTION = 180;

const SECTIONS: OnThisPageItem[] = [
  { id: 'sec-photos', label: 'Photos', icon: 'image' },
  { id: 'sec-price', label: 'Price & availability', icon: 'check' },
  { id: 'sec-fac', label: 'Facilities', icon: 'bolt' },
  { id: 'sec-about', label: 'About', icon: 'doc' },
  { id: 'sec-loc', label: 'Location', icon: 'pin' },
  { id: 'sec-landlord', label: 'Landlord', icon: 'user' },
];

function Facility({
  included,
  icon,
  label,
  status,
}: {
  included: boolean;
  icon: IconName;
  label: string;
  status: string;
}) {
  return (
    <div className={included ? 'facility yes' : 'facility no'}>
      <span className="fi">
        <Icon name={icon} />
      </span>
      <span>
        <b>{label}</b>
        <span className="st">
          <Icon name={included ? 'check' : 'x'} />
          {status}
        </span>
      </span>
    </div>
  );
}

function Facilities({ property }: { property: PropertyDetail }) {
  const { water, electricity, bathroom, security, selfContained } = property;

  return (
    <section className="panel" aria-labelledby="fac-h" id="sec-fac">
      <h2 className="t-section" id="fac-h">
        Facilities
      </h2>
      <div className="facility-grid">
        <Facility
          included={water}
          icon="water"
          label="Water"
          status={water ? 'Included' : 'Not included'}
        />
        <Facility
          included={electricity}
          icon="bolt"
          label="Electricity"
          status={electricity ? 'Included' : 'Not included (prepaid by tenant)'}
        />
        <Facility
          included
          icon="bath"
          label="Bathroom"
          status={bathroom === 'PRIVATE' ? 'Private bathroom' : 'Shared with other tenants'}
        />
        <Facility
          included={security}
          icon="shield"
          label="Security"
          status={security ? 'Guard or locked gate' : 'No guard'}
        />
        <Facility
          included
          icon="home"
          label="Layout"
          status={
            selfContained
              ? 'Self-contained (private kitchen/bath)'
              : 'Shared kitchen and facilities'
          }
        />
      </div>
    </section>
  );
}

function About({ description }: { description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="panel" aria-labelledby="desc-h" id="sec-about">
      <h2 className="t-section" id="desc-h">
        About this place
      </h2>
      <p className={open ? 'desc' : 'desc clamp'} id="desc-text">
        {description}
      </p>
      {description.length > LONG_DESCRIPTION && (
        <button
          type="button"
          className="link-btn"
          aria-expanded={open}
          aria-controls="desc-text"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </section>
  );
}

function Location({ property }: { property: PropertyDetail }) {
  const { data: locations = [] } = useLocations();
  const { area, landmark, distanceKm, areaDistanceKm, pin } = property;

  return (
    <section className="panel" aria-labelledby="loc-h" id="sec-loc">
      <h2 className="t-section" id="loc-h">
        Location
      </h2>
      <p className="muted">
        <Icon name="pin" /> {area} · {landmark}
      </p>
      <div className="map">
        <SchematicMap locations={locations} area={area} pin={pin} />
      </div>
      <ul className="landmarks">
        <li>
          <span>UR-CST campus gate</span>
          <b className="num">{formatKm(distanceKm)}</b>
        </li>
        <li>
          <span>Nearest landmark: {landmark}</span>
          <b>Nearby</b>
        </li>
        <li>
          <span>Neighbourhood centre: {area}</span>
          <b className="num">{formatKm(areaDistanceKm)} from campus</b>
        </li>
      </ul>
    </section>
  );
}

function PricePanel({ property, onReport }: { property: PropertyDetail; onReport: () => void }) {
  const { id, title, rentRwf, distanceKm, availability, reviewStatus, type, rooms, area } =
    property;
  const compare = useCompare();
  const saved = useSaved();
  const comparing = compare.isComparing(id);
  const isSaved = saved.isSaved(id);
  const occupied = availability !== 'AVAILABLE';
  const approved = reviewStatus === 'APPROVED';

  return (
    <div className="panel" id="sec-price">
      <div className="row status-pair">
        <AvailabilityBadge availability={availability} />
        <ReviewBadge status={reviewStatus} />
      </div>
      <p className="price-big">
        <span className="t-page num">{formatRwf(rentRwf)}</span>{' '}
        <span className="muted">/ month</span>
      </p>
      <p className="row price-distance">
        <Icon name="pin" />
        <span className="num">{formatKm(distanceKm)} from UR-CST</span>
      </p>
      <hr className="divider" />
      <dl className="kv">
        <dt>Room type</dt>
        <dd>{ROOM_TYPE_LABELS[type]}</dd>
        <dt>Number of rooms</dt>
        <dd className="num">{rooms}</dd>
        <dt>Facilities</dt>
        <dd>{layoutLabel(property)}</dd>
        <dt>Neighbourhood</dt>
        <dd>{area}</dd>
      </dl>
      {occupied && (
        <div className="notice warn price-notice">
          <Icon name="door" />
          <span>
            <b>Currently occupied.</b> You can still save it or ask the landlord when it will be
            free.
          </span>
        </div>
      )}
      <p className="t-help price-help">
        <Icon name="info" />{' '}
        {approved
          ? '"Approved by admin" means the listing details were checked. It does not confirm today\'s availability. Ask the landlord.'
          : 'This listing has not been approved yet. Students cannot see it.'}
      </p>
      {approved && (
        <div className="stack-sm price-actions">
          <Link
            className={buttonClass({ size: 'lg', block: true })}
            to={`/properties/${id}/contact`}
          >
            <Icon name="message" />
            {occupied ? 'Ask about future availability' : 'Contact landlord'}
          </Link>
          <div className="row price-row">
            <button
              type="button"
              className={`${buttonClass({ variant: 'secondary' })} save-btn`}
              aria-pressed={isSaved}
              aria-label={`${isSaved ? 'Saved' : 'Save property'}: ${title}`}
              onClick={() => saved.toggle(id)}
            >
              <Icon name="heart" />
              {isSaved ? 'Saved' : 'Save property'}
            </button>
            <Button
              variant="secondary"
              icon={comparing ? 'check' : 'compare'}
              aria-pressed={comparing}
              onClick={() => compare.toggle(id)}
            >
              {comparing ? 'In compare' : 'Add to compare'}
            </Button>
          </div>
          <button type="button" className="link-btn report-link" onClick={onReport}>
            <Icon name="flag" /> Report a problem with this listing
          </button>
        </div>
      )}
    </div>
  );
}

function LandlordPanel({ property }: { property: PropertyDetail }) {
  const { id, landlord, reviewStatus } = property;
  const methods: { key: string; icon: IconName; label: string; on: boolean }[] = [
    { key: 'phone', icon: 'phone', label: 'Phone', on: landlord.phone !== null },
    { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', on: landlord.whatsapp !== null },
    { key: 'inapp', icon: 'message', label: 'In-app message', on: landlord.inApp },
  ];

  return (
    <div className="panel" id="sec-landlord">
      <h2 className="t-card">Landlord</h2>
      <div className="row">
        <span className="avatar">{initials(landlord.name)}</span>
        <b>{landlord.name}</b>
      </div>
      {reviewStatus === 'APPROVED' && (
        <div className="stack-sm landlord-methods">
          {methods
            .filter(({ on }) => on)
            .map(({ key, icon, label }) => (
              <Link
                key={key}
                className={buttonClass({ variant: 'secondary', block: true })}
                to={`/properties/${id}/contact?method=${key}`}
              >
                <Icon name={icon} />
                {label}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

interface PropertyBodyProps {
  property: PropertyDetail;
  /** Extra buttons beside Listen, such as those on the landlord's preview. */
  actions?: ReactNode;
}

export function PropertyBody({ property, actions }: PropertyBodyProps) {
  const { id, title, area, rentRwf, distanceKm, availability, photos, description } = property;
  const reader = useReader();
  const heading = useRef<HTMLHeadingElement>(null);
  const [reporting, setReporting] = useState(false);
  const saved = useSaved();
  const isSaved = saved.isSaved(id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="t-page" ref={heading}>
            {title}
          </h1>
          <p className="muted">
            {typeLabel(property)} · {area}, Kigali
          </p>
        </div>
        <div className="row">
          <Button
            variant="secondary"
            icon="volume"
            onClick={() =>
              reader.start(title, [
                { element: heading.current, text: `${spokenSummary(property)} ${description}` },
              ])
            }
          >
            Listen to this property
          </Button>
          {actions}
        </div>
      </div>
      <OnThisPage items={SECTIONS} />
      <div className="two-col">
        <div className="stack detail-main">
          <section aria-label="Photos" id="sec-photos">
            <Gallery photos={photos} title={title} />
          </section>
          <Facilities property={property} />
          <About description={description} />
          <Location property={property} />
        </div>
        <aside className="stack sticky" aria-label="Price and contact">
          <PricePanel property={property} onReport={() => setReporting(true)} />
          <LandlordPanel property={property} />
        </aside>
      </div>
      {property.reviewStatus === 'APPROVED' && (
        <div className="sticky-contact">
          <span>
            <b className="num">{formatRwf(rentRwf)}</b>
            <span className="t-support choice-text">
              {formatKm(distanceKm)} · {availability === 'AVAILABLE' ? 'Available' : 'Occupied'}
            </span>
          </span>
          <span className="row sticky-actions">
            <button
              type="button"
              className="icon-btn save-btn"
              aria-pressed={isSaved}
              aria-label={`${isSaved ? 'Remove from saved' : 'Save'} ${title}`}
              onClick={() => saved.toggle(id)}
            >
              <Icon name="heart" />
            </button>
            <Link className={buttonClass()} to={`/properties/${id}/contact`}>
              <Icon name="message" />
              Contact
            </Link>
          </span>
        </div>
      )}
      {reporting && <ReportDialog property={property} onClose={() => setReporting(false)} />}
    </>
  );
}
