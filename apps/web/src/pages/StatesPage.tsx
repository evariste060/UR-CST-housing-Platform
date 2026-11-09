import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { EmptyState, ErrorState, SkeletonCards, SuccessState } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { t, tNode } from '../i18n';

function Example({ title, children }: { title: string; children: ReactNode }) {
  const id = `st-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby={id}>
      <h2 className="m-0 text-[1.0625rem] font-semibold" id={id}>
        {tNode(title)}
      </h2>
      {children}
    </section>
  );
}

/** The empty, error, loading and feedback patterns used across the app. Buttons here work. */
export function StatesPage() {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('System states')}</h1>
          <p className="muted m-0">
            {t(
              'Reusable empty, error, loading and confirmation patterns used across the app. Buttons here are live.',
            )}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        <Example title={t('No search results')}>
          <EmptyState
            icon="search"
            title={t('No accommodation matches your filters.')}
            text={t('Try a higher budget, a longer distance, or fewer filters.')}
            actions={
              <Link className={buttonClass({ variant: 'secondary' })} to="/search">
                {t('Open search')}
              </Link>
            }
          />
        </Example>
        <Example title={t('Saved properties empty')}>
          <EmptyState
            icon="heart"
            title={t("You haven't saved any properties yet.")}
            text={t('Tap the heart on a listing to keep it here.')}
            actions={
              <Link className={buttonClass()} to="/search">
                {t('Explore accommodation')}
              </Link>
            }
          />
        </Example>
        <Example title={t('Network error')}>
          <ErrorState
            icon="wifi"
            title={t('Unable to load accommodation. Please try again.')}
            text={t('Check your connection. Your filters are kept.')}
            actions={
              <Button icon="refresh" onClick={() => toast('Reconnected. Accommodation loaded.')}>
                {t('Try again')}
              </Button>
            }
          />
        </Example>
        <Example title={t('Loading')}>
          <div
            className="rounded-lg border border-line bg-card p-5"
            role="status"
            aria-label={t('Loading example')}
          >
            <SkeletonCards count={1} />
          </div>
        </Example>
        <Example title={t('Listing submitted')}>
          <SuccessState
            title={t('Your listing was submitted for review.')}
            text={t("An administrator will check it. You'll get a notification with the result.")}
          />
        </Example>
        <Example title={t('Feedback toasts and confirmation')}>
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-card p-5">
            <p className="muted m-0">
              {t('Toasts confirm an action and offer Undo where it is safe to reverse.')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon="check"
                onClick={() =>
                  toast('Availability updated successfully.', {
                    undo: () => toast('Availability change undone.', { type: 'info' }),
                  })
                }
              >
                {t('Availability updated')}
              </Button>
              <Button
                variant="secondary"
                icon="heart"
                onClick={() => toast('Saved to your list. This does not reserve the room.')}
              >
                {t('Property saved')}
              </Button>
              <Button
                variant="secondary"
                icon="alert"
                onClick={() => toast('Please fix the highlighted fields.', { type: 'error' })}
              >
                {t('Validation failed')}
              </Button>
            </div>
            <div>
              <Button variant="danger-outline" icon="trash" onClick={() => setConfirming(true)}>
                {t('Deletion confirmation')}
              </Button>
            </div>
            <div className="notice err m-0!">
              <Icon name="alert" />
              <span>
                <b>{t('Inline error:')}</b> {t('Enter a valid email address.')}
              </span>
            </div>
            <div className="notice ok m-0!">
              <Icon name="check" />
              <span>
                <b>{t('Inline success:')}</b>{' '}
                {t('Message sent. The landlord will see it in their inquiries.')}
              </span>
            </div>
          </div>
        </Example>
      </div>
      {confirming && (
        <ConfirmDialog
          title={t('Delete this listing?')}
          body={t('Students will no longer see it. You can undo straight after deleting.')}
          confirm={t('Delete listing')}
          tone="danger"
          icon="trash"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            toast('Example listing deleted. Nothing was really removed.', {
              undo: () => toast('Example listing restored.', { type: 'info' }),
            });
          }}
        />
      )}
    </main>
  );
}
