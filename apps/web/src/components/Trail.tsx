import type { Role } from '@urcst/shared';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { crumbsFor, type Crumb } from '../lib/routes';
import { Badge } from './Badge';
import { buttonClass } from './Button';
import { Icon, type IconName } from './Icon';

const AREA: Record<Role | 'GUEST', { label: string; icon: IconName }> = {
  GUEST: { label: 'Visitor', icon: 'user' },
  STUDENT: { label: 'Student area', icon: 'user' },
  LANDLORD: { label: 'Landlord workspace', icon: 'building' },
  ADMIN: { label: 'Admin workspace', icon: 'shieldcheck' },
};

function CrumbList({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <ol>
      {crumbs.map(({ label, to }, index) => (
        <li key={label}>
          {index === crumbs.length - 1 ? (
            <span aria-current="page">{label}</span>
          ) : to ? (
            <Link to={to}>{label}</Link>
          ) : (
            <span>{label}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function useCrumbs() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return { crumbs: crumbsFor(pathname, user?.role), role: user?.role };
}

/** "You are here" for landlord and administrator pages, on its own row with a Back link. */
export function Trail() {
  const { crumbs, role } = useCrumbs();
  const back =
    crumbs.length > 2
      ? crumbs
          .slice(0, -1)
          .reverse()
          .find(({ to }) => to)
      : undefined;
  const area = AREA[role ?? 'GUEST'];

  return (
    <nav className="trail" aria-label="You are here">
      <div className="in">
        <span className="here">
          <Icon name="pin" />
          You are here:
        </span>
        <CrumbList crumbs={crumbs} />
        <span className="trail-right">
          {back?.to && (
            <Link className={buttonClass({ variant: 'ghost', size: 'sm' })} to={back.to}>
              <Icon name="chevL" />
              Back to {back.label}
            </Link>
          )}
          <Badge tone="neutral" icon={area.icon}>
            {area.label}
          </Badge>
        </span>
      </div>
    </nav>
  );
}

/** "You are here" for public pages. It sits in the header's navigation row. */
export function HereTrail() {
  const { crumbs } = useCrumbs();
  return (
    <nav className="here-trail" aria-label="You are here">
      <Icon name="home" />
      <span className="lbl">You are here:</span>
      <CrumbList crumbs={crumbs} />
    </nav>
  );
}
