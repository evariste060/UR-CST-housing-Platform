import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReader } from '../reader/useReader';
import { AvailabilityBadge, type Availability } from './Badge';
import { Button, buttonClass } from './Button';
import { Icon, type IconName } from './Icon';
import { PhotoArrows } from './PhotoArrows';
import { t, tNode } from '../i18n';

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
  photos: string[];
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
  const { title, rent, distanceKm, availability, photos } = property;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = photos[photoIndex % photos.length];
  const card = useRef<HTMLElement>(null);
  const reader = useReader();
  const href = `/properties/${property.id}`;

  return (
    <article
      ref={card}
      className="pcard group transition-[box-shadow,translate] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-raised"
      aria-label={tNode(title)}
      data-speak={property.spokenSummary}
    >
      <div className="media overflow-hidden">
        <Link className="media-link" to={href} tabIndex={-1} aria-hidden="true">
          {photo && (
            <img
              className="transition-transform duration-300 ease-out group-hover:scale-105"
              src={photo}
              alt=""
              loading="lazy"
            />
          )}
        </Link>
        <AvailabilityBadge availability={availability} />
        <PhotoArrows
          title={title}
          count={photos.length}
          index={photoIndex % photos.length}
          onChange={setPhotoIndex}
          placement="top-1/2 -translate-y-1/2"
        />
        <button
          type="button"
          className="icon-btn save-btn"
          aria-pressed={saved}
          aria-label={`${saved ? t('Remove from saved') : t('Save')} ${title}`}
          title={saved ? t('Saved') : t('Save')}
          onClick={onToggleSave}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="body">
        <div className="price-line">
          <span className="t-price num">{formatRwf(rent)}</span>
          <span>{t('/ month')}</span>
        </div>
        <div className="meta">
          <Icon name="pin" />
          <span className="num">
            {distanceKm.toFixed(1)} {t('km')}
          </span>
          <span className="meta-from">{t('from UR-CST')}</span>
        </div>
        <div className="row-between pcard-title-row">
          <Link className="title transition-colors duration-300 group-hover:text-blue" to={href}>
            {tNode(title)}
          </Link>
          <button
            type="button"
            className="icon-btn listen-btn"
            aria-label={t('Listen to details of {title}', { title })}
            title={t('Listen')}
            onClick={() =>
              reader.start(title, [{ element: card.current, text: property.spokenSummary }])
            }
          >
            <Icon name="volume" />
          </button>
        </div>
        <div className="sub">
          {tNode(property.typeLabel)} · {tNode(property.layoutLabel)} · {tNode(property.area)}
        </div>
        <div className="facs">
          {property.facilities.slice(0, 3).map(({ label, icon }) => (
            <span className="fchip" key={label}>
              <Icon name={icon} />
              {tNode(label)}
            </span>
          ))}
        </div>
        <div className="actions">
          <Link className={buttonClass({ size: 'sm' })} to={href}>
            {t('View details')}
          </Link>
          <Button
            variant="secondary"
            size="sm"
            icon={inCompare ? 'check' : 'compare'}
            aria-pressed={inCompare}
            onClick={onToggleCompare}
          >
            {inCompare ? t('In compare') : t('Compare')}
          </Button>
        </div>
      </div>
    </article>
  );
}
