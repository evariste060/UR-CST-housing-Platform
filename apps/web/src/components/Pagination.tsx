import { Icon } from './Icon';
import { t, tNode } from '../i18n';

const BUTTON =
  'inline-grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-sm border border-line bg-card px-3 text-sm font-semibold text-ink hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 aria-[current=page]:border-blue aria-[current=page]:bg-blue aria-[current=page]:text-white';

/** Up to five page numbers around the current one. */
function pageNumbers(page: number, pages: number) {
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  const last = Math.min(pages, first + 4);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export function Pagination({
  page,
  pageSize,
  total,
  noun,
  label,
  compact = false,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Plural, for example "properties". */
  noun: string;
  /** Names the navigation landmark, for example "Property pages". */
  label: string;
  compact?: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="t-support num m-0" aria-live="polite">
        {t('Showing')} {tNode(from)}–{tNode(to)} {t('of')} {total} {tNode(noun)}
      </p>
      {pages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label={tNode(label)}>
          <button
            type="button"
            className={BUTTON}
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label={t('Previous page')}
          >
            <span className="inline-flex items-center gap-1">
              <Icon name="chevL" />
              {!compact && t('Previous')}
            </span>
          </button>
          {pageNumbers(page, pages).map((number) => (
            <button
              key={number}
              type="button"
              className={BUTTON}
              aria-current={number === page ? 'page' : undefined}
              aria-label={t('Page {number}', { number })}
              onClick={() => onChange(number)}
            >
              {tNode(number)}
            </button>
          ))}
          <button
            type="button"
            className={BUTTON}
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
            aria-label={t('Next page')}
          >
            <span className="inline-flex items-center gap-1">
              {!compact && t('Next')}
              <Icon name="chevR" />
            </span>
          </button>
        </nav>
      )}
    </div>
  );
}
