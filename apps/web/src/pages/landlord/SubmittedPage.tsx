import { Link, useParams } from 'react-router-dom';
import { buttonClass } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { useListing } from '../../landlord/queries';
import { t, tNode } from '../../i18n';

const NEXT_STEPS: { icon: IconName; title: string; text: string; done?: boolean }[] = [
  { icon: 'check', title: 'Submitted', text: 'Your listing is saved and waiting.', done: true },
  {
    icon: 'shieldcheck',
    title: 'Administrator review',
    text: 'An administrator checks the details and photos.',
  },
  {
    icon: 'eye',
    title: 'Visible to students',
    text: "Once it is approved, students can find it. We'll notify you of the result.",
  },
];

export function SubmittedPage() {
  const { id = '' } = useParams();
  const { data } = useListing(id);
  const title = data?.values.title ?? 'Your listing';

  return (
    <main className="page" id="main">
      <h1 className="sr-only">{t('Listing submitted')}</h1>
      <div className="mx-auto my-6 max-w-[680px] rounded-lg border border-line bg-card p-8 text-center max-phone:p-5">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-50 text-green-text [&>.ic]:size-8">
          <Icon name="check" />
        </span>
        <div role="status">
          <h2 className="mt-4 mb-2 text-[1.5rem] leading-snug font-semibold">
            {t('Your listing has been submitted for review.')}
          </h2>
          <p className="muted m-0">
            {tNode(title)}{' '}
            {t(
              'is now Pending review. An administrator will check it. Students will see it once it is approved.',
            )}
          </p>
        </div>
        <ol className="mx-auto mt-6 mb-0 flex max-w-[520px] list-none flex-col gap-0 p-0 text-left">
          {NEXT_STEPS.map(({ icon, title: stepTitle, text, done }, index) => (
            <li key={stepTitle} className="relative flex gap-3 pb-5 last:pb-0">
              {index < NEXT_STEPS.length - 1 && (
                <span
                  className="absolute top-11 left-[21px] h-[calc(100%-44px)] w-0.5 bg-line"
                  aria-hidden="true"
                />
              )}
              <span
                className={`grid size-11 flex-none place-items-center rounded-full ${done ? 'bg-blue text-white' : 'border-2 border-line bg-card text-muted'}`}
              >
                <Icon name={icon} />
              </span>
              <span className="flex flex-col pt-1">
                <b>
                  {tNode(stepTitle)}
                  {done && <span className="sr-only"> {t('(done)')}</span>}
                </b>
                <span className="t-support">{tNode(text)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className={buttonClass()} to="/landlord/properties">
            {t('View my properties')}
          </Link>
          <Link className={buttonClass({ variant: 'secondary' })} to="/landlord/properties/new">
            <Icon name="plus" />
            {t('Add another')}
          </Link>
        </div>
      </div>
    </main>
  );
}
