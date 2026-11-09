import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DashCard } from '../components/DashCard';
import { Icon } from '../components/Icon';
import { MiniProperty } from '../components/MiniProperty';
import { ErrorState, Skeleton } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { useResultCount } from '../student/queries';
import { useHistoryData, useRunSearch, type HistorySearch } from '../student/useHistory';
import { t, tNode } from '../i18n';

function SearchRow({ search }: { search: HistorySearch }) {
  const runSearch = useRunSearch();
  const toast = useToast();
  const { data: count } = useResultCount(search.filters);

  return (
    <div className="mini flex items-center gap-3 rounded-md border border-line p-3 max-phone:flex-wrap">
      <span className="grid size-10 flex-none place-items-center rounded-full bg-blue-50 text-blue-700">
        <Icon name="search" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="break-words">{tNode(search.label)}</b>
        <div className="t-support num">
          {tNode(search.when)}
          {count !== undefined && t(' · {count} current results', { count })}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon="refresh"
        aria-label={t('Re-run search: {label}', { label: search.label })}
        onClick={() => {
          runSearch(search.filters);
          toast(t('Search re-run: {label}', { label: search.label }));
        }}
      >
        {t('Re-run search')}
      </Button>
    </div>
  );
}

export function HistoryPage() {
  const { views, searches, isPending, isError, retry, clear } = useHistoryData();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  async function confirmClear() {
    setConfirming(false);
    try {
      await clear();
    } catch {
      toast('We could not clear your history. Please try again.', { type: 'error' });
    }
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load your history. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={retry}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (isPending) {
      return (
        <div
          className="grid grid-cols-1 gap-6 min-[1280px]:grid-cols-2"
          role="status"
          aria-busy="true"
          aria-label={t('Loading your history')}
        >
          <Skeleton height={220} />
          <Skeleton height={220} />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 items-start gap-6 min-[1280px]:grid-cols-2">
        <DashCard
          title={t('Recently viewed')}
          count={views.length}
          intro={t('Properties you opened, newest first.')}
        >
          {views.length ? (
            <div className="flex flex-col">
              {views.map((property) => (
                <MiniProperty key={property.id} property={property}>
                  <Link
                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                    to={`/properties/${property.id}`}
                    aria-label={t('Open {title}', { title: property.title })}
                  >
                    {t('Open')}
                  </Link>
                </MiniProperty>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="muted m-0">{t('Properties you open will appear here.')}</p>
              <Link className={buttonClass({ variant: 'secondary' })} to="/search">
                <Icon name="search" />
                {t('Find accommodation')}
              </Link>
            </div>
          )}
        </DashCard>
        <DashCard
          title={t('Recent searches & filters')}
          count={searches.length}
          intro={t("Re-run a search to see today's results.")}
        >
          {searches.length ? (
            <div className="flex flex-col gap-2">
              {searches.map((search) => (
                <SearchRow key={search.key} search={search} />
              ))}
            </div>
          ) : (
            <p className="muted m-0">{t('Searches you run will appear here.')}</p>
          )}
        </DashCard>
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Recently viewed & search history')}</h1>
          <p className="muted m-0">
            {t('Go back to places and searches without remembering their names.')}
          </p>
        </div>
        {(views.length > 0 || searches.length > 0) && (
          <Button variant="danger-outline" icon="trash" onClick={() => setConfirming(true)}>
            {t('Clear history')}
          </Button>
        )}
      </div>
      {content()}
      {confirming && (
        <ConfirmDialog
          title={t('Clear your history?')}
          body={t(
            'Recently viewed properties and recent searches will be removed. Saved properties are kept.',
          )}
          confirm={t('Clear history')}
          tone="danger"
          icon="trash"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void confirmClear()}
        />
      )}
    </main>
  );
}
