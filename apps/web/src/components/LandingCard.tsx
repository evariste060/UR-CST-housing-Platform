import { ROOM_TYPE_LABELS, type PropertySummary } from '@urcst/shared';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber, spokenSummary, formatKm } from '../lib/format';
import { useReader } from '../reader/useReader';
import { useSaved } from '../student/SavedProvider';
import { buttonClass } from './Button';
import { Icon, type IconName } from './Icon';

function thirdChip({ bathroom, water, electricity }: PropertySummary): [IconName, string] {
  if (bathroom === 'PRIVATE') return ['bath', 'Private Bathroom'];
  if (water && electricity) return ['bolt', 'Water + Electricity'];
  return ['bath', 'Shared Bathroom'];
}

/** The larger card used in Featured Accommodation on the landing page. */
export function LandingCard({ property }: { property: PropertySummary }) {
  const { id, title, area, distanceKm, rentRwf, selfContained, availability, coverUrl } = property;
  const card = useRef<HTMLElement>(null);
  const reader = useReader();
  const saved = useSaved();
  const isSaved = saved.isSaved(id);
  const summary = spokenSummary(property);
  const href = `/properties/${id}`;
  const available = availability === 'AVAILABLE';
  const [thirdIcon, thirdLabel] = thirdChip(property);

  return (
    <article ref={card} className="lcard" aria-label={title} data-speak={summary}>
      <div className="lmedia">
        <Link to={href} tabIndex={-1} aria-hidden="true">
          {coverUrl && <img src={coverUrl} alt="" loading="lazy" />}
        </Link>
        <span className={available ? 'lbadge ok' : 'lbadge occ'}>
          <span className="ldot" />
          {available ? 'Available' : 'Occupied'}
        </span>
        <button
          type="button"
          className="icon-btn save-btn lheart"
          aria-pressed={isSaved}
          aria-label={`${isSaved ? 'Remove from saved' : 'Save'} ${title}`}
          title={isSaved ? 'Saved' : 'Save'}
          onClick={() => saved.toggle(id)}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="lbody">
        <div className="row-between lcard-title-row">
          <Link className="ltitle" to={href}>
            {title}
          </Link>
          <button
            type="button"
            className="icon-btn listen-btn"
            aria-label={`Listen to details of ${title}`}
            title="Listen"
            onClick={() => reader.start(title, [{ element: card.current, text: summary }])}
          >
            <Icon name="volume" />
          </button>
        </div>
        <div className="lmeta">
          <span>
            <Icon name="pin" />
            {area}, Kigali
          </span>
          <span className="sep" aria-hidden="true" />
          <span>
            <Icon name="route" />
            <span className="num">{formatKm(distanceKm)}</span> from UR-CST
          </span>
        </div>
        <div className="lchips">
          <span>
            <Icon name="bed" />
            {ROOM_TYPE_LABELS[property.type]}
          </span>
          <span>
            <Icon name={selfContained ? 'home' : 'kitchen'} />
            {selfContained ? 'Self-contained' : 'Shared Facilities'}
          </span>
          <span>
            <Icon name={thirdIcon} />
            {thirdLabel}
          </span>
        </div>
        <p className="lprice">
          <b className="num">RWF {formatNumber(rentRwf)}</b> / month
        </p>
        <div className="lacts">
          <Link className={buttonClass({ variant: 'outline' })} to={href}>
            View Details <Icon name="arrowR" />
          </Link>
          <Link className={buttonClass()} to={`${href}/contact`}>
            <Icon name="message" />
            Contact Landlord
          </Link>
        </div>
      </div>
    </article>
  );
}
