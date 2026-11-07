import { Link, useLocation } from 'react-router-dom';
import { MAX_COMPARE, useCompare } from '../student/CompareProvider';
import { usePropertiesByIds } from '../student/queries';
import { Button, buttonClass } from './Button';
import { Icon } from './Icon';

const TRAY_PAGES = [/^\/search$/, /^\/saved$/, /^\/properties\/[^/]+$/];

/** Follows the visitor around the pages where they are choosing rooms. */
export function CompareTray() {
  const { pathname } = useLocation();
  const compare = useCompare();
  const { items } = usePropertiesByIds(compare.ids);

  if (items.length === 0 || !TRAY_PAGES.some((page) => page.test(pathname))) return null;

  return (
    <div className="compare-tray" role="region" aria-label="Compare selection">
      <Icon name="compare" />
      <span>
        <b>{items.length}</b> of {MAX_COMPARE} selected
      </span>
      <span className="thumbs-mini">
        {items.map(({ id, title, coverUrl }) =>
          coverUrl ? <img key={id} src={coverUrl} alt={title} /> : null,
        )}
      </span>
      <Link className={buttonClass({ size: 'sm' })} to="/compare">
        {items.length < 2 ? 'Open compare' : 'Compare now'}
      </Link>
      <Button variant="on-dark" size="sm" onClick={compare.clear}>
        Clear
      </Button>
    </div>
  );
}
