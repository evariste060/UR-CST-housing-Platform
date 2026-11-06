import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { MiniProperty } from '../components/MiniProperty';
import { ErrorState, Skeleton } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { useResultCount } from '../student/queries';
import { useHistoryData, useRunSearch, type HistorySearch } from '../student/useHistory';

function SearchRow({ search }: { search: HistorySearch }) {
  const runSearch = useRunSearch();
  const toast = useToast();
  const { data: count } = useResultCount(search.filters);

  return (
    <div className="mini">
      <span className="avatar sm">
        <Icon name="search" />
      </span>
      <div className="grow">
        <b>{search.label}</b>
        <div className="t-support">
          {search.when}
          {count !== undefined && ` · ${count} current results`}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon="refresh"
        aria-label={`Re-run search: ${search.label}`}
        onClick={() => {
          runSearch(search.filters);
          toast(`Search re-run: ${search.label}`);
        }}
      >
        Re-run search
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
          title="Unable to load your history. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={retry}>
              Try again
            </Button>
          }
        />
      );
    }
    if (isPending) {
      return (
        <div className="dash-grid" role="status" aria-busy="true" aria-label="Loading your history">
          <Skeleton height={220} />
          <Skeleton height={220} />
        </div>
      );
    }
    return (
      <div className="dash-grid">
        <section className="panel" aria-labelledby="rv-h">
          <h2 className="t-section" id="rv-h">
            Recently viewed
          </h2>
          {views.length ? (
            <div>
              {views.map((property) => (
                <MiniProperty key={property.id} property={property}>
                  <Link
                    className={buttonClass({ variant: 'secondary', size: 'sm' })}
                    to={`/properties/${property.id}`}
                    aria-label={`Open ${property.title}`}
                  >
                    Open
                  </Link>
                </MiniProperty>
              ))}
            </div>
          ) : (
            <p className="muted">Properties you open will appear here.</p>
          )}
        </section>
        <section className="panel" aria-labelledby="sh-h">
          <h2 className="t-section" id="sh-h">
            Recent searches &amp; filters
          </h2>
          {searches.length ? (
            <div>
              {searches.map((search) => (
                <SearchRow key={search.key} search={search} />
              ))}
            </div>
          ) : (
            <p className="muted">Searches you run will appear here.</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Recently viewed &amp; search history</h1>
          <p className="muted">Go back to places and searches without remembering their names.</p>
        </div>
        {(views.length > 0 || searches.length > 0) && (
          <Button variant="danger-outline" icon="trash" onClick={() => setConfirming(true)}>
            Clear history
          </Button>
        )}
      </div>
      {content()}
      {confirming && (
        <ConfirmDialog
          title="Clear your history?"
          body="Recently viewed properties and recent searches will be removed. Saved properties are kept."
          confirm="Clear history"
          tone="danger"
          icon="trash"
          onCancel={() => setConfirming(false)}
          onConfirm={() => void confirmClear()}
        />
      )}
    </main>
  );
}
