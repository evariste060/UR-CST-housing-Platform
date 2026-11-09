import {
  SUPPORT_TOPIC_LABELS,
  SUPPORT_TOPICS,
  supportMessageSchema,
  toFieldErrors,
  type SupportTopic,
} from '@urcst/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { OnThisPage } from '../components/OnThisPage';
import { PickGroup } from '../components/PickGroup';
import { ApiError, api } from '../lib/api';
import { t, tNode } from '../i18n';

interface FaqGroup {
  id: string;
  title: string;
  icon: IconName;
  questions: [question: string, answer: string][];
}

const FAQ: FaqGroup[] = [
  {
    id: 'searching',
    title: 'Searching',
    icon: 'search',
    questions: [
      [
        'How do I search for accommodation?',
        'Go to Find Housing. Type a neighbourhood, or use the filters on the left (on a phone, tap Filters). Set your maximum rent, distance from UR-CST and room type. Results change straight away, and the number of matches is shown at the top.',
      ],
      [
        'What does the distance mean?',
        'It is an approximate distance from the UR-CST campus gate. Use it to compare places. Walk the route yourself before you decide.',
      ],
      [
        "Why can't I find any rooms?",
        'Your filters may be too strict. On the no-results screen, try Increase budget, Expand distance or Remove filters.',
      ],
    ],
  },
  {
    id: 'saving',
    title: 'Saving',
    icon: 'heart',
    questions: [
      [
        'How do I save accommodation?',
        "Tap the heart on any property. Saved properties are listed under Saved, so you don't need to remember their names.",
      ],
      [
        'Does saving reserve the room?',
        'No. Saving only keeps the property on your list. Contact the landlord to ask about the room.',
      ],
    ],
  },
  {
    id: 'contacting',
    title: 'Contacting landlords',
    icon: 'message',
    questions: [
      [
        'How do I contact a landlord?',
        'Open a property and select Contact landlord. Choose phone, WhatsApp or an in-app message. Your in-app messages and the replies are under My inquiries.',
      ],
      [
        'Is the platform involved in paying rent?',
        'No. The pilot does not handle rent payments, bookings or contracts. Agree these directly with the landlord, and visit before you pay anything.',
      ],
    ],
  },
  {
    id: 'publishing',
    title: 'Publishing a property',
    icon: 'building',
    questions: [
      [
        'How do I publish a property?',
        'Sign up as a landlord, then select Add Property. A five-step form guides you: basic information, location, rent and facilities, photos, and review. Your answers are kept if you go back.',
      ],
      [
        'When will students see my listing?',
        'After an administrator approves it. Until then it shows as Pending review in My Properties. You get a notification with the result.',
      ],
      [
        'How do I mark a room as taken?',
        'In My Properties, select Mark as occupied. You can undo straight away if you pressed it by mistake.',
      ],
    ],
  },
];

const JUMPS = [
  ...FAQ.map(({ id, title, icon }) => ({ id, label: title, icon })),
  { id: 'support', label: 'Contact support', icon: 'mail' as IconName },
];

const TOPIC_ICONS: Record<SupportTopic, IconName> = {
  SEARCH: 'search',
  ACCOUNT: 'user',
  LISTING: 'building',
  PROBLEM: 'flag',
};

const TOPIC_OPTIONS = SUPPORT_TOPICS.map((value) => ({
  value,
  label: SUPPORT_TOPIC_LABELS[value],
  icon: TOPIC_ICONS[value],
}));

function ContactSupport() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [topic, setTopic] = useState<SupportTopic>();
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    setProblem('');
    const result = supportMessageSchema.safeParse({ name, email, topic, message });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await api.contactSupport(result.data);
      setSentTo(result.data.email);
      setMessage('');
      setTopic(undefined);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setProblem(
          error instanceof Error ? error.message : 'We could not send your message. Try again.',
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <aside
      className="rounded-lg border border-line bg-card desktop:sticky desktop:top-[calc(var(--hh)+1.5rem)]"
      id="support"
      aria-labelledby="support-h"
    >
      <div className="border-b border-line px-5 py-4">
        <h2 className="m-0 flex items-center gap-2 text-[1.125rem] font-semibold" id="support-h">
          <span className="grid size-9 place-items-center rounded-md bg-blue-50 text-blue-700">
            <Icon name="mail" />
          </span>
          {t('Contact support')}
        </h2>
        <p className="t-support mt-1 mb-0">
          {t("Can't find your answer? Send us a message and we'll reply by email.")}
        </p>
      </div>
      <div className="p-5">
        {sentTo ? (
          <div className="flex flex-col items-start gap-3">
            <div className="notice ok m-0!" role="status">
              <Icon name="check" />
              <span>
                {t('Thanks. Your message was sent to the support team. They will reply to')}{' '}
                <b>{tNode(sentTo)}</b>.
              </span>
            </div>
            <Button variant="secondary" icon="send" onClick={() => setSentTo(null)}>
              {t('Send another message')}
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void send(event)}>
            {problem && (
              <div className="notice err m-0!" role="alert">
                <Icon name="alert" />
                <span>{tNode(problem)}</span>
              </div>
            )}
            <Field
              id="hp-name"
              label={t('Your name')}
              value={name}
              onChange={setName}
              autoComplete="name"
              required
              error={errors.name}
            />
            <Field
              id="hp-email"
              label={t('Email address')}
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              help={t('We reply to this address.')}
              required
              error={errors.email}
            />
            <PickGroup
              label={t('Topic')}
              value={topic}
              options={TOPIC_OPTIONS}
              onChange={setTopic}
              none={t('Nothing yet')}
              error={errors.topic}
            />
            <Field
              id="hp-msg"
              label={t('Message')}
              rows={5}
              value={message}
              onChange={setMessage}
              placeholder={t('Tell us what happened and what you expected.')}
              maxLength={2000}
              required
              error={errors.message}
            />
            <Button type="submit" icon="send" disabled={sending}>
              {sending ? t('Sending…') : t('Send message')}
            </Button>
          </form>
        )}
      </div>
    </aside>
  );
}

export function HelpPage() {
  const { hash } = useLocation();

  // Links such as "How publishing works" open a section straight away.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' });
  }, [hash]);

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Help & support')}</h1>
          <p className="muted m-0">
            {t('Short answers to common questions. Tap a topic to jump to it.')}
          </p>
        </div>
      </div>
      <OnThisPage items={JUMPS} />
      <div className="mt-6 grid grid-cols-1 items-start gap-6 desktop:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-8">
          {FAQ.map(({ id, title, icon, questions }) => (
            <section
              key={id}
              id={id}
              className="scroll-mt-[calc(var(--hh)+1rem)]"
              aria-labelledby={`${id}-h`}
            >
              <h2 className="t-section mb-3! flex items-center gap-2" id={`${id}-h`}>
                <span className="grid size-9 place-items-center rounded-md bg-blue-50 text-blue-700">
                  <Icon name={icon} />
                </span>
                {tNode(title)}
              </h2>
              <div className="flex flex-col gap-2">
                {questions.map(([question, answer]) => (
                  <details
                    key={question}
                    className="faq group rounded-lg border border-line bg-card open:border-blue"
                  >
                    <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 py-3.5 font-semibold hover:bg-surface [&::-webkit-details-marker]:hidden">
                      {tNode(question)}
                      <span className="flex-none transition-transform group-open:rotate-180 motion-reduce:transition-none">
                        <Icon name="chevD" />
                      </span>
                    </summary>
                    <p className="m-0 px-5 pb-4 leading-relaxed">{tNode(answer)}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <ContactSupport />
      </div>
    </main>
  );
}
