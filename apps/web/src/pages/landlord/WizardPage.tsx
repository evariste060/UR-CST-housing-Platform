import { stepErrors, WIZARD_STEPS, type ListingForm, type ListingPatch } from '@urcst/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { ApiError } from '../../lib/api';
import { useFocusFirstError } from '../../lib/useFocusFirstError';
import { SubmitButton } from '../../landlord/SubmitButton';
import { useListing } from '../../landlord/queries';
import { BasicStep } from '../../landlord/steps/BasicStep';
import { LocationStep } from '../../landlord/steps/LocationStep';
import { PhotosStep } from '../../landlord/steps/PhotosStep';
import { RentStep } from '../../landlord/steps/RentStep';
import { ReviewStep } from '../../landlord/steps/ReviewStep';
import { forgetDraftId, readDraftId, useDraft } from '../../landlord/useDraft';
import { t, tNode, tr } from '../../i18n';

const LAST_STEP = WIZARD_STEPS.length;

/** What each step is for, and one tip, shown beside the form. */
const STEP_INFO = [
  {
    hint: 'Name, type and description',
    intro: 'Tell students what kind of place this is.',
    tip: 'A clear title with the neighbourhood and room type helps students find you.',
  },
  {
    hint: 'Neighbourhood and landmark',
    intro: 'Help students find it and judge the walk to campus.',
    tip: 'Use a landmark students already know, such as a market, school or main road.',
  },
  {
    hint: 'Monthly rent and what is included',
    intro: 'Set the monthly rent and say what it covers.',
    tip: 'Saying whether water and electricity are included saves you repeated questions.',
  },
  {
    hint: 'At least one clear photo',
    intro: 'Clear photos help students decide before they visit.',
    tip: 'Listings with 3 or more bright photos get more inquiries.',
  },
  {
    hint: 'Check, then send for approval',
    intro: 'Check everything, then send it to an administrator for approval.',
    tip: 'Approval usually takes a short while. You can still edit the listing later.',
  },
];

function Progress({
  step,
  expanded,
  onGo,
}: {
  step: number;
  expanded: boolean;
  onGo: (step: number) => void;
}) {
  return (
    <ol
      className="relative m-0 flex list-none justify-between p-0 desktop:flex-col desktop:gap-1"
      id="wizard-steps"
      aria-label={t('Progress')}
    >
      {WIZARD_STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} className="relative flex-1 desktop:flex-none">
            {number < WIZARD_STEPS.length && (
              <span
                className={`absolute top-[22px] left-[calc(50%+22px)] h-0.5 w-[calc(100%-44px)] desktop:top-[52px] desktop:left-[29px] desktop:h-[calc(100%-40px)] desktop:w-0.5 ${done ? 'bg-blue' : 'bg-line'}`}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-md border-0 bg-transparent p-1 text-center text-ink transition-colors enabled:hover:bg-blue-50 disabled:cursor-default desktop:flex-row desktop:items-start desktop:gap-3 desktop:p-2 desktop:text-left"
              disabled={number > step}
              aria-current={current ? 'step' : undefined}
              title={expanded ? undefined : tr(label)}
              onClick={() => onGo(number)}
            >
              <span
                className={`relative z-[1] grid size-11 flex-none place-items-center rounded-full border-2 font-semibold ${
                  done
                    ? 'border-blue bg-blue text-white'
                    : current
                      ? 'border-blue bg-card text-blue-700 shadow-[0_0_0_4px_var(--blue-50)]'
                      : 'border-line bg-card text-muted'
                }`}
              >
                {done ? <Icon name="check" /> : number}
              </span>
              <span className="flex min-w-0 flex-col desktop:pt-1.5">
                <span
                  className={
                    expanded
                      ? `text-sm leading-tight font-semibold desktop:text-base ${current ? 'text-ink' : 'text-muted'}`
                      : 'sr-only'
                  }
                >
                  {tNode(label)}
                </span>
                <span className={expanded ? 'hidden text-sm text-muted desktop:block' : 'hidden'}>
                  {tNode(STEP_INFO[index]?.hint)}
                </span>
                <span className="sr-only">
                  {done ? t(' (done)') : current ? t(' (current step)') : ''}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function fixMessage(count: number) {
  return `Please fix the ${count === 1 ? 'highlighted field' : `${count} highlighted fields`} to continue.`;
}

const savedTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function Wizard({ form }: { form: ListingForm | null }) {
  const draft = useDraft(form);
  const { values, photos, savedAt, saveFailed } = draft;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<string>();
  const formElement = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Separate from `errors`, so fixing one field does not pull focus to the next while typing.
  const [failedCheck, setFailedCheck] = useState<Record<string, string>>({});
  // The progress panel starts small, showing only the step numbers.
  const [stepsOpen, setStepsOpen] = useState(false);
  useFocusFirstError(formElement, failedCheck);

  // A step can't be opened before the ones ahead of it are complete, even from the address.
  const stepsReady = [1, 2, 3, 4].find(
    (number) => Object.keys(stepErrors(number, values, photos.length)).length > 0,
  );
  const step = Math.min(Number(params.get('step')) || 1, stepsReady ?? LAST_STEP);
  const shownStep = useRef(step);

  useEffect(() => {
    if (shownStep.current !== step) heading.current?.focus();
    shownStep.current = step;
  }, [step]);

  function goTo(next: number) {
    setErrors({});
    setPhotoError(undefined);
    setParams({ step: String(next) });
  }

  function change(patch: ListingPatch) {
    draft.change(patch);
    setErrors((current) => {
      const rest = { ...current };
      for (const key of Object.keys(patch)) delete rest[key];
      return rest;
    });
  }

  async function next(event: FormEvent) {
    event.preventDefault();
    if (step === LAST_STEP) return;
    const found = stepErrors(step, values, photos.length);
    setErrors(found);
    setFailedCheck(found);
    setPhotoError(found.photos);
    if (Object.keys(found).length > 0) return;

    if (!(await draft.flush())) return;
    // Add accommodation becomes the draft's own address once it has been saved.
    if (!form) navigate(`/landlord/properties/${draft.getId()}/edit?step=2`);
    else goTo(step + 1);
  }

  async function preview() {
    if (await draft.flush()) navigate(`/landlord/properties/${draft.getId()}/preview`);
  }

  const fieldErrors = step === 4 ? {} : errors;
  const errorCount = Object.keys(fieldErrors).length;
  const stepProps = { values, errors, change };

  const info = STEP_INFO[step - 1];
  const percent = Math.round(((step - 1) / LAST_STEP) * 100);

  return (
    <div
      className={`grid grid-cols-1 items-start gap-6 transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${stepsOpen ? 'desktop:grid-cols-[300px_minmax(0,1fr)]' : 'desktop:grid-cols-[92px_minmax(0,1fr)]'}`}
    >
      <aside className="flex flex-col gap-4 desktop:sticky desktop:top-24">
        <div
          className={`rounded-lg border border-line bg-card ${stepsOpen ? 'p-4' : 'p-4 desktop:p-3'}`}
        >
          <div
            className={`mb-3 flex flex-wrap items-center justify-between gap-2 px-1 ${stepsOpen ? '' : 'desktop:flex-col desktop:px-0'}`}
          >
            <span
              className={`text-sm font-semibold text-muted ${stepsOpen ? '' : 'desktop:sr-only'}`}
            >
              {t('Your progress')}
            </span>
            <span className="num text-sm font-semibold text-blue-700">
              {percent}
              <span className={stepsOpen ? undefined : 'desktop:sr-only'}>{t('% done')}</span>
              {!stepsOpen && (
                <span className="hidden desktop:inline" aria-hidden="true">
                  %
                </span>
              )}
            </span>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border border-line bg-card px-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              aria-expanded={stepsOpen}
              aria-controls="wizard-steps"
              title={stepsOpen ? t('Hide step names') : t('Show step names')}
              onClick={() => setStepsOpen((open) => !open)}
            >
              <Icon name={stepsOpen ? 'chevL' : 'chevR'} />
              <span className="desktop:sr-only">
                {stepsOpen ? t('Hide step names') : t('Show step names')}
              </span>
            </button>
          </div>
          <Progress step={step} expanded={stepsOpen} onGo={goTo} />
        </div>
        {stepsOpen && info && (
          <div className="hidden gap-3 rounded-lg bg-blue-50 p-4 desktop:flex">
            <span className="mt-0.5 text-blue-700">
              <Icon name="info" />
            </span>
            <p className="m-0 text-sm text-ink">
              <b className="block">{t('Tip')}</b>
              {tNode(info.tip)}
            </p>
          </div>
        )}
      </aside>
      <section className="min-w-0 rounded-lg border border-line bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5 max-phone:px-4">
          <div className="min-w-0">
            <h2 className="outline-none" ref={heading} tabIndex={-1}>
              <span className="block text-sm font-semibold tracking-wide text-blue-700 uppercase">
                {t('Step')} {step} {t('of')} {tNode(LAST_STEP)}
                <span className="sr-only">:</span>
              </span>{' '}
              <span className="block text-[1.375rem] leading-snug font-semibold">
                {tNode(WIZARD_STEPS[step - 1])}
              </span>
            </h2>
            {info && <p className="muted mt-1 mb-0">{tNode(info.intro)}</p>}
          </div>
          <span
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-medium text-green-text"
            id="autosave"
            aria-live="polite"
          >
            {saveFailed ? (
              <span className="inline-flex items-center gap-1.5 text-red-text">
                <Icon name="alert" />
                {t('Draft not saved. Check your connection.')}
              </span>
            ) : savedAt ? (
              <>
                <Icon name="check" />
                {t('Draft saved')} {tNode(savedTime(savedAt))}
              </>
            ) : (
              <span className="text-muted">{t('Your answers save automatically')}</span>
            )}
          </span>
        </div>
        <form ref={formElement} onSubmit={(event) => void next(event)} noValidate>
          <div className="px-6 py-6 max-phone:px-4 [&_.form-grid]:gap-y-6">
            {errorCount > 0 && (
              <div className="notice err mb-5" role="alert">
                <Icon name="alert" />
                <span>{tNode(fixMessage(errorCount))}</span>
              </div>
            )}
            {step === 1 && <BasicStep {...stepProps} />}
            {step === 2 && <LocationStep {...stepProps} />}
            {step === 3 && <RentStep {...stepProps} />}
            {step === 4 && <PhotosStep draft={draft} error={photoError} onError={setPhotoError} />}
            {step === 5 && (
              <ReviewStep
                values={values}
                photos={photos}
                isEdit={form?.reviewStatus !== 'DRAFT'}
                onEdit={goTo}
              />
            )}
          </div>
          <div className="sticky bottom-0 z-[2] flex flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-line bg-card px-6 py-4 max-phone:px-4">
            {step > 1 ? (
              <Button variant="secondary" icon="chevL" onClick={() => goTo(step - 1)}>
                {t('Back')}
              </Button>
            ) : (
              <Link className={buttonClass({ variant: 'secondary' })} to="/landlord/properties">
                {t('Cancel')}
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {step === LAST_STEP ? (
                <>
                  <Button variant="secondary" icon="eye" onClick={() => void preview()}>
                    {t('Preview as student')}
                  </Button>
                  <SubmitButton
                    id={draft.getId() ?? ''}
                    values={values}
                    photoCount={photos.length}
                    label={t('Submit Listing')}
                    size="lg"
                    beforeSubmit={draft.flush}
                  />
                </>
              ) : (
                <>
                  <span className="num text-sm text-muted max-phone:hidden">
                    {t('Next:')} {tNode(WIZARD_STEPS[step])}
                  </span>
                  <button type="submit" className={buttonClass({ size: 'lg' })}>
                    {t('Continue')} <Icon name="chevR" />
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function WizardPage() {
  const { id: routeId } = useParams();
  const [storedId] = useState(() => (routeId ? null : readDraftId()));
  const id = routeId ?? storedId;
  const { data, isPending, isError, error, refetch } = useListing(id);
  const missing = isError && error instanceof ApiError && error.status === 404;
  const staleDraft = missing && !routeId;

  useEffect(() => {
    if (staleDraft) forgetDraftId();
  }, [staleDraft]);

  function content() {
    if (!id || staleDraft) return <Wizard key="new" form={null} />;
    if (missing) {
      return (
        <EmptyState
          icon="building"
          title={t('Listing not found')}
          text={t('It may have been deleted.')}
          actions={
            <Link className={buttonClass()} to="/landlord/properties">
              {t('My properties')}
            </Link>
          }
        />
      );
    }
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load this listing. Please try again.')}
          text={t('Your saved draft is safe. Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (isPending) {
      return (
        <div className="stack" role="status" aria-busy="true" aria-label={t('Loading your draft')}>
          <Skeleton height={48} />
          <Skeleton height={320} />
        </div>
      );
    }
    return <Wizard key={id} form={data} />;
  }

  const isEdit = data !== undefined && data.reviewStatus !== 'DRAFT';

  return (
    <main className="page" id="main">
      <Link
        className="mb-3 inline-flex min-h-11 items-center gap-1 font-semibold text-blue-700"
        to="/landlord/properties"
      >
        <Icon name="chevL" />
        {t('Back to My Properties')}
      </Link>
      <div className="page-head">
        <div>
          <h1 className="t-page">{isEdit ? t('Edit accommodation') : t('Add accommodation')}</h1>
          <p className="muted m-0">
            {t('Five short steps. Your answers save as you go, so you can stop and come back.')}
          </p>
        </div>
      </div>
      {content()}
    </main>
  );
}
