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

const LAST_STEP = WIZARD_STEPS.length;

function Progress({ step, onGo }: { step: number; onGo: (step: number) => void }) {
  return (
    <ol className="progress" aria-label="Progress">
      {WIZARD_STEPS.map((label, index) => {
        const number = index + 1;
        const state = number < step ? 'done' : number === step ? 'cur' : undefined;
        return (
          <li key={label} className={state}>
            <button
              type="button"
              disabled={number > step}
              aria-current={number === step ? 'step' : undefined}
              onClick={() => onGo(number)}
            >
              <div className="bar" />
              <span className="lbl">
                {number < step ? <Icon name="check" /> : <span className="num">{number}.</span>}
                <span className="t">{label}</span>
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

  return (
    <>
      <Progress step={step} onGo={goTo} />
      <div className="panel">
        <div className="row-between wizard-head">
          <h2 className="t-section" ref={heading} tabIndex={-1}>
            Step {step} of {LAST_STEP}: {WIZARD_STEPS[step - 1]}
          </h2>
          <span className="autosave" id="autosave" aria-live="polite">
            {saveFailed ? (
              <span className="autosave-failed">
                <Icon name="alert" />
                Draft not saved. Check your connection.
              </span>
            ) : (
              savedAt && (
                <>
                  <Icon name="check" />
                  Draft saved {savedTime(savedAt)}
                </>
              )
            )}
          </span>
        </div>
        {errorCount > 0 && (
          <div className="notice err wizard-notice" role="alert">
            <Icon name="alert" />
            <span>{fixMessage(errorCount)}</span>
          </div>
        )}
        <form ref={formElement} onSubmit={(event) => void next(event)} noValidate>
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
          <div className="wiz-foot">
            <div className="row">
              {step > 1 ? (
                <Button variant="secondary" icon="chevL" onClick={() => goTo(step - 1)}>
                  Back
                </Button>
              ) : (
                <Link className={buttonClass({ variant: 'secondary' })} to="/landlord/properties">
                  Cancel
                </Link>
              )}
            </div>
            <div className="row">
              {step === LAST_STEP ? (
                <>
                  <Button variant="secondary" icon="eye" onClick={() => void preview()}>
                    Preview as student
                  </Button>
                  <SubmitButton
                    id={draft.getId() ?? ''}
                    values={values}
                    photoCount={photos.length}
                    label="Submit Listing"
                    size="lg"
                    beforeSubmit={draft.flush}
                  />
                </>
              ) : (
                <button type="submit" className={buttonClass({ size: 'lg' })}>
                  Continue <Icon name="chevR" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
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
          title="Listing not found"
          text="It may have been deleted."
          actions={
            <Link className={buttonClass()} to="/landlord/properties">
              My properties
            </Link>
          }
        />
      );
    }
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load this listing. Please try again."
          text="Your saved draft is safe. Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (isPending) {
      return (
        <div className="stack" role="status" aria-busy="true" aria-label="Loading your draft">
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
      <div className="page-head">
        <div>
          <h1 className="t-page">{isEdit ? 'Edit accommodation' : 'Add accommodation'}</h1>
          <p className="muted">One step at a time. Your answers are kept if you go back.</p>
        </div>
      </div>
      {content()}
    </main>
  );
}
