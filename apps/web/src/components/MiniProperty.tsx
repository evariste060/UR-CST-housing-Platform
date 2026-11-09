import type { PropertySummary } from '@urcst/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatRwf, formatKm } from '../lib/format';
import { t, tNode } from '../i18n';

/** A compact listing row, used on the dashboard and history pages. */
export function MiniProperty({
  property,
  children,
}: {
  property: PropertySummary;
  children?: ReactNode;
}) {
  const { id, title, rentRwf, distanceKm, availability, coverUrl } = property;

  return (
    <div className="mini">
      {coverUrl && <img src={coverUrl} alt="" />}
      <div className="grow">
        <Link className="t" to={`/properties/${id}`}>
          {tNode(title)}
        </Link>
        <div className="t-support num">
          {formatRwf(rentRwf)} · {formatKm(distanceKm)} ·{' '}
          {availability === 'AVAILABLE' ? t('Available') : t('Occupied')}
        </div>
      </div>
      {children}
    </div>
  );
}
