import { ROOM_TYPE_LABELS, type PropertySummary } from '@urcst/shared';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber, spokenSummary, formatKm } from '../lib/format';
import { useReader } from '../reader/useReader';
import { useSaved } from '../student/SavedProvider';
import { buttonClass } from './Button';
import { Icon, type IconName } from './Icon';
import { PhotoArrows } from './PhotoArrows';
import { t, tNode } from '../i18n';

function thirdChip({ bathroom, water, electricity }: PropertySummary): [IconName, string] {
  if (bathroom === 'PRIVATE') return ['bath', 'Private Bathroom'];
  if (water && electricity) return ['bolt', 'Water + Electricity'];
  return ['bath', 'Shared Bathroom'];
}

/** The larger card used in Featured Accommodation on the landing page. */
export function LandingCard({ property }: { property: PropertySummary }) {
  const { id, title, area, distanceKm, rentRwf, selfContained, availability, photoUrls } = property;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = photoUrls[photoIndex % photoUrls.length];
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
      className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-card shadow-soft transition-[box-shadow,translate] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-raised"
      aria-label={tNode(title)}
      data-speak={summary}
    >
      <div className="relative aspect-452/130 min-h-[120px] overflow-hidden bg-slate-100 max-phone:aspect-16/7">
        <Link className="block h-full" to={href} tabIndex={-1} aria-hidden="true">
          {photo && (
            <img
              className="size-full object-cover object-[center_30%] transition-transform duration-300 ease-out group-hover:scale-105"
              src={photo}
              alt=""
              loading="lazy"
            />
          )}
        </Link>
        <PhotoArrows
          title={title}
          count={photoUrls.length}
          index={photoIndex % photoUrls.length}
          onChange={setPhotoIndex}
          placement="bottom-1.5"
        />
        <span
          className={`absolute top-2.5 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${available ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-[#f1f5f9] text-[#1e293b]'}`}
        >
          <span
            className={`size-[9px] rounded-full ${available ? 'bg-[#16a34a]' : 'bg-[#64748b]'}`}
          />
          {available ? t('Available') : t('Occupied')}
        </span>
        <button
          type="button"
          className="icon-btn save-btn absolute top-2.5 right-2.5 z-[1] border border-line bg-white/95 text-[#0f172a] shadow-soft aria-pressed:text-[#b91c1c]"
          aria-pressed={isSaved}
          aria-label={`${isSaved ? t('Remove from saved') : t('Save')} ${title}`}
          title={isSaved ? t('Saved') : t('Save')}
          onClick={() => saved.toggle(id)}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-3 pb-[18px]">
        <div className="row-between flex-nowrap gap-2">
          <Link
            className="text-[1.1875rem] font-extrabold tracking-[-0.01em] text-ink no-underline transition-colors duration-300 group-hover:text-blue hover:underline"
            to={href}
          >
            {tNode(title)}
          </Link>
          <button
            type="button"
            className="icon-btn listen-btn"
            aria-label={t('Listen to details of {title}', { title })}
            title={t('Listen')}
            onClick={() => reader.start(title, [{ element: card.current, text: summary }])}
          >
            <Icon name="volume" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-sm [&_.ic]:size-4">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="pin" />
            {tNode(area)}
            {t(', Kigali')}
          </span>
          <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5">
            <Icon name="route" />
            <span className="num">{formatKm(distanceKm)}</span> {t('from UR-CST')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 [&_.ic]:size-[15px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:rounded-full [&>span]:bg-slate-100 [&>span]:px-2.5 [&>span]:py-1 [&>span]:text-[0.8125rem] [&>span]:font-medium">
          <span>
            <Icon name="bed" />
            {tNode(ROOM_TYPE_LABELS[property.type])}
          </span>
          <span>
            <Icon name={selfContained ? 'home' : 'kitchen'} />
            {selfContained ? t('Self-contained') : t('Shared Facilities')}
          </span>
          <span>
            <Icon name={thirdIcon} />
            {tNode(thirdLabel)}
          </span>
        </div>
        <p className="text-[0.9375rem]">
          <b className="num text-[1.3125rem] font-extrabold text-blue">
            {t('RWF')} {formatNumber(rentRwf)}
          </b>{' '}
          {t('/ month')}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-1 [&_.btn]:px-2.5 [&_.btn]:py-2">
          <Link
            className={`${buttonClass({ variant: 'outline' })} hover:bg-blue! hover:text-white!`}
            to={href}
          >
            {t('View Details')} <Icon name="arrowR" />
          </Link>
          <Link className={buttonClass()} to={`${href}/contact`}>
            {t('Contact Landlord')}
          </Link>
        </div>
      </div>
    </article>
  );
}
