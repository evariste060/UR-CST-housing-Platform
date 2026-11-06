import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReader } from '../reader/useReader';
import { AvailabilityBadge, type Availability } from './Badge';
import { Button, buttonClass } from './Button';
import { Icon, type IconName } from './Icon';

export interface PropertyCardData {
  id: string;
  title: string;
  rent: number;
  distanceKm: number;
  availability: Availability;
  /** For example "Single room". */
  typeLabel: string;
  /** For example "Self-contained". */
  layoutLabel: string;
  area: string;
  photo: string;
  facilities: { label: string; icon: IconName }[];
  /** What Listen reads for this card. */
  spokenSummary: string;
}

interface PropertyCardProps {
  property: PropertyCardData;
  saved: boolean;
  inCompare: boolean;
  onToggleSave: () => void;
  onToggleCompare: () => void;
}

const formatRwf = (amount: number) => `${amount.toLocaleString('en-US')} RWF`;

export function PropertyCard({
  property,
  saved,
  inCompare,
  onToggleSave,
  onToggleCompare,
}: PropertyCardProps) {
  const { title, rent, distanceKm, availability, photo } = property;
  const card = useRef<HTMLElement>(null);
  const reader = useReader();
  const href = `/properties/${property.id}`;

  return (
    <article ref={card} className="pcard" aria-label={title} data-speak={property.spokenSummary}>
      <div className="media">
        <Link className="media-link" to={href} tabIndex={-1} aria-hidden="true">
          <img src={photo} alt="" loading="lazy" />
        </Link>
        <AvailabilityBadge availability={availability} />
        <button
          type="button"
          className="icon-btn save-btn"
          aria-pressed={saved}
          aria-label={`${saved ? 'Remove from saved' : 'Save'} ${title}`}
          title={saved ? 'Saved' : 'Save'}
          onClick={onToggleSave}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="body">
        <div className="price-line">
          <span className="t-price num">{formatRwf(rent)}</span>
          <span>/ month</span>
        </div>
        <div className="meta">
          <Icon name="pin" />
          <span className="num">{distanceKm.toFixed(1)} km</span>
          <span className="meta-from">from UR-CST</span>
        </div>
        <div className="row-between pcard-title-row">
          <Link className="title" to={href}>
            {title}
          </Link>
          <button
            type="button"
            className="icon-btn listen-btn"
            aria-label={`Listen to details of ${title}`}
            title="Listen"
            onClick={() =>
              reader.start(title, [{ element: card.current, text: property.spokenSummary }])
            }
          >
            <Icon name="volume" />
          </button>
        </div>
        <div className="sub">
          {property.typeLabel} · {property.layoutLabel} · {property.area}
        </div>
        <div className="facs">
          {property.facilities.slice(0, 3).map(({ label, icon }) => (
            <span className="fchip" key={label}>
              <Icon name={icon} />
              {label}
            </span>
          ))}
        </div>
        <div className="actions">
          <Link className={buttonClass({ size: 'sm' })} to={href}>
            View details
          </Link>
          <Button
            variant="secondary"
            size="sm"
            icon={inCompare ? 'check' : 'compare'}
            aria-pressed={inCompare}
            onClick={onToggleCompare}
          >
            {inCompare ? 'In compare' : 'Compare'}
          </Button>
        </div>
      </div>
    </article>
  );
}
