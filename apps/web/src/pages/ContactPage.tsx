import { useQueryClient } from '@tanstack/react-query';
import { inquirySchema, toFieldErrors, type PropertyDetail } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { AvailabilityBadge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { ChoiceField } from '../components/ChoiceCards';
import { Icon, type IconName } from '../components/Icon';
import { ErrorState, SuccessState } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { formatRwf, initials, formatKm } from '../lib/format';
import { useFocusFirstError } from '../lib/useFocusFirstError';
import { useProperty } from '../student/queries';
import { ListingUnavailable, PropertyLoading } from './PropertyPage';

type Method = 'phone' | 'whatsapp' | 'inapp';

const METHODS: { value: Method; icon: IconName; title: string; description: string }[] = [
  { value: 'phone', icon: 'phone', title: 'Phone', description: 'Call the landlord' },
  { value: 'whatsapp', icon: 'whatsapp', title: 'WhatsApp', description: 'Chat on WhatsApp' },
  { value: 'inapp', icon: 'message', title: 'In-app message', description: 'Send a message here' },
];

const startingMessage = (title: string) =>
  `Hello, I am a UR-CST student interested in this room (${title}). Is it still available?`;

function PhonePanel({ property }: { property: PropertyDetail }) {
  const { name, phone } = property.landlord;
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone ?? '');
      toast('Number copied.');
    } catch {
      toast(`Copy not available here. The number is ${phone}.`, { type: 'info' });
    }
  }

  return (
    <>
      <h2 className="t-card">Call {name}</h2>
      <p className="t-page num contact-number">{phone}</p>
      <div className="row contact-actions">
        <a className={buttonClass()} href={`tel:${phone?.replace(/\s/g, '')}`}>
          <Icon name="phone" />
          Call now
        </a>
        <Button variant="secondary" icon="copy" onClick={() => void copy()}>
          Copy number
        </Button>
      </div>
      <div className="tip contact-tip">
        <Icon name="info" />
        Tip: ask if the room is still free, what is included in the rent, and when you can visit.
      </div>
    </>
  );
}

function WhatsAppPanel({ property }: { property: PropertyDetail }) {
  const { title, landlord } = property;
  const message = startingMessage(title);

  return (
    <>
      <h2 className="t-card">WhatsApp {landlord.name}</h2>
      <p className="muted">Your message will be ready to send in WhatsApp:</p>
      <blockquote className="panel panel-tight contact-quote">{message}</blockquote>
      <a
        className={buttonClass()}
        href={`https://wa.me/${landlord.whatsapp}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="whatsapp" />
        Open WhatsApp
      </a>
    </>
  );
}

function MessageForm({ property }: { property: PropertyDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const form = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState(startingMessage(property.title));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useFocusFirstError(form, errors);

  async function send(event: FormEvent) {
    event.preventDefault();
    const result = inquirySchema.safeParse({ message });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      await api.sendInquiry(property.id, result.data.message);
      await queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      setSent(true);
      toast('Message sent to the landlord.');
    } catch (error) {
      if (error instanceof ApiError && error.fields.message) {
        setErrors(error.fields);
      } else {
        toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <SuccessState
        title="Message sent"
        text="Your inquiry is now in your dashboard. The landlord can read it and reply."
        actions={
          <>
            <Link className={buttonClass()} to="/student">
              View my inquiries
            </Link>
            <Link className={buttonClass({ variant: 'secondary' })} to="/search">
              Keep searching
            </Link>
          </>
        }
      />
    );
  }

  return (
    <form ref={form} className="stack" onSubmit={(event) => void send(event)} noValidate>
      <div className={errors.message ? 'field has-error' : 'field'}>
        <label htmlFor="inq-msg">Your message</label>
        <textarea
          className="textarea"
          id="inq-msg"
          rows={5}
          value={message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? 'inq-msg-err' : 'inq-msg-help'}
          onChange={(event) => setMessage(event.target.value)}
        />
        {errors.message ? (
          <p className="err-msg" id="inq-msg-err">
            <Icon name="alert" />
            {errors.message}
          </p>
        ) : (
          <p className="t-help" id="inq-msg-help">
            Say when you would like to move in or visit.
          </p>
        )}
      </div>
      <div className="row">
        <Button type="submit" icon="send" disabled={busy}>
          Send message
        </Button>
      </div>
    </form>
  );
}

function MessagePanel({ property }: { property: PropertyDetail }) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();

  if (user?.role === 'STUDENT') return <MessageForm property={property} />;

  if (user) {
    return (
      <>
        <h2 className="t-card">Send a message</h2>
        <p className="muted">Only student accounts can send messages to landlords.</p>
      </>
    );
  }

  const from = `${pathname}${search}`;

  return (
    <>
      <h2 className="t-card">Send a message</h2>
      <p className="muted">
        Log in as a student so the landlord knows who is asking and you can see replies.
      </p>
      <div className="row contact-actions">
        <Link className={buttonClass()} to="/login" state={{ from }}>
          Log in
        </Link>
        <Link
          className={buttonClass({ variant: 'secondary' })}
          to="/register"
          state={{ from, role: 'STUDENT' }}
        >
          Create an account
        </Link>
      </div>
    </>
  );
}

function ContactContent({ property }: { property: PropertyDetail }) {
  const { title, rentRwf, distanceKm, availability, coverUrl, landlord } = property;
  const [params] = useSearchParams();
  const options = METHODS.filter(({ value }) =>
    value === 'phone'
      ? landlord.phone !== null
      : value === 'whatsapp'
        ? landlord.whatsapp !== null
        : landlord.inApp,
  );
  const asked = options.find(({ value }) => value === params.get('method'))?.value;
  const [method, setMethod] = useState<Method | undefined>(
    asked ?? (landlord.inApp ? 'inapp' : options[0]?.value),
  );

  return (
    <div className="two-col">
      <div className="stack">
        <ChoiceField label="Contact method" value={method} options={options} onChoose={setMethod} />
        <div className="panel">
          {method === 'phone' && <PhonePanel property={property} />}
          {method === 'whatsapp' && <WhatsAppPanel property={property} />}
          {method === 'inapp' && <MessagePanel property={property} />}
          {!method && <p className="muted">This landlord has no contact method turned on.</p>}
        </div>
      </div>
      <aside className="stack" aria-label="About this listing">
        <div className="panel">
          {coverUrl && <img className="contact-photo" src={coverUrl} alt="" />}
          <h2 className="t-card contact-title">{title}</h2>
          <p className="num contact-line">
            <b>{formatRwf(rentRwf)}</b>{' '}
            <span className="muted">/ month · {formatKm(distanceKm)}</span>
          </p>
          <div className="row contact-badge">
            <AvailabilityBadge availability={availability} />
          </div>
        </div>
        <div className="panel">
          <h2 className="t-card">Landlord</h2>
          <div className="row contact-landlord">
            <span className="avatar">{initials(landlord.name)}</span>
            <span>
              <b>{landlord.name}</b>
              <span className="t-support choice-text">
                Accepts: {options.map((option) => option.title).join(', ')}
              </span>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ContactPage() {
  const { id = '' } = useParams();
  const { data: property, isPending, isError, error, refetch } = useProperty(id);

  function content() {
    if (isPending) return <PropertyLoading />;
    if (isError) {
      if (error instanceof ApiError && error.status === 404) return <ListingUnavailable />;
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load this listing. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    return property.reviewStatus === 'APPROVED' ? (
      <ContactContent property={property} />
    ) : (
      <ListingUnavailable />
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Contact landlord</h1>
          <p className="muted">Choose how you would like to get in touch.</p>
        </div>
      </div>
      {content()}
    </main>
  );
}
