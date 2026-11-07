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
    <article
      ref={card}
      className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-card shadow-soft hover:shadow-raised"
      aria-label={title}
      data-speak={summary}
    >
      <div className="relative aspect-452/130 overflow-hidden bg-slate-100 max-phone:aspect-16/7">
        <Link className="block h-full" to={href} tabIndex={-1} aria-hidden="true">
          {coverUrl && (
            <img
              className="size-full object-cover object-[center_30%]"
              src={coverUrl}
              alt=""
              loading="lazy"
            />
          )}
        </Link>
        <span
          className={`absolute top-2.5 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${available ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#f1f5f9] text-[#1e293b]'}`}
        >
          <span
            className={`size-[9px] rounded-full ${available ? 'bg-[#16a34a]' : 'bg-[#64748b]'}`}
          />
          {available ? 'Available' : 'Occupied'}
        </span>
        <button
          type="button"
          className="icon-btn save-btn text-[#0f172a] aria-pressed:text-[#b91c1c]"
          aria-pressed={isSaved}
          aria-label={`${isSaved ? 'Remove from saved' : 'Save'} ${title}`}
          title={isSaved ? 'Saved' : 'Save'}
          onClick={() => saved.toggle(id)}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-3 pb-[18px]">
        <div className="row-between flex-nowrap gap-2">
          <Link
            className="text-[1.1875rem] font-extrabold tracking-[-0.01em] text-ink no-underline hover:underline"
            to={href}
          >
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
        <div className="flex flex-wrap items-center gap-2.5 text-sm [&_.ic]:size-4">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="pin" />
            {area}, Kigali
          </span>
          <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Icon name="route" />
            <span className="num">{formatKm(distanceKm)}</span> from UR-CST
          </span>
        </div>
        <div className="flex flex-wrap gap-2 [&_.ic]:size-[15px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:rounded-full [&>span]:bg-slate-100 [&>span]:px-2.5 [&>span]:py-1 [&>span]:text-[0.8125rem] [&>span]:font-medium">
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
        <p className="text-[0.9375rem]">
          <b className="num text-[1.3125rem] font-extrabold text-blue">
            RWF {formatNumber(rentRwf)}
          </b>{' '}
          / month
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-1 [&_.btn]:px-2.5 [&_.btn]:py-2">
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
