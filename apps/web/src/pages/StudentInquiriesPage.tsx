import { useQueryClient } from '@tanstack/react-query';
import { replySchema, toFieldErrors, type StudentInquiry } from '@urcst/shared';
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, buttonClass } from '../components/Button';
import { Icon } from '../components/Icon';
import { ReplyBadge } from '../components/InquiryBadge';
import { EmptyState, ErrorState, Skeleton } from '../components/StateBlocks';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { formatDay, formatTime, formatWhen, initials } from '../lib/format';
import { useInquiries, useInquiryConversation } from '../student/queries';
import { t, tNode } from '../i18n';

const PREVIEW_LENGTH = 60;

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="grid h-12 w-14 flex-none place-items-center overflow-hidden rounded-md border border-line bg-surface text-muted">
      {url ? <img className="size-full object-cover" src={url} alt="" /> : <Icon name="image" />}
    </span>
  );
}

function InquiryRow({
  inquiry,
  selected,
  onOpen,
}: {
  inquiry: StudentInquiry;
  selected: boolean;
  onOpen: () => void;
}) {
  const { property, lastMessage, replied } = inquiry;
  const preview =
    lastMessage.body.length > PREVIEW_LENGTH
      ? `${lastMessage.body.slice(0, PREVIEW_LENGTH)}…`
      : lastMessage.body;

  return (
    <button
      type="button"
      className={`list-item clickable flex! w-full cursor-pointer items-start! gap-3! border-0! border-b! border-l-4! border-solid border-line px-4! py-3.5! text-left transition-colors hover:bg-surface ${selected ? 'border-l-blue! bg-blue-50! hover:bg-blue-50!' : 'border-l-transparent!'}`}
      aria-current={selected ? 'true' : undefined}
      onClick={onOpen}
    >
      <Thumb url={property.coverUrl} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <b className="truncate">{tNode(property.title)}</b>
          <span className="num flex-none text-sm text-muted">
            {tNode(formatWhen(lastMessage.createdAt))}
          </span>
        </span>
        <span className="truncate text-[0.9375rem] text-muted">
          {lastMessage.fromLandlord ? t('Landlord: ') : t('You: ')}
          {tNode(preview)}
        </span>
        <span className="mt-1">
          <ReplyBadge replied={replied} />
        </span>
      </span>
    </button>
  );
}

/** Lets the student keep writing to the landlord in the same conversation. */
function Composer({ id }: { id: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const result = replySchema.safeParse({ message: draft });
    if (!result.success) {
      setError(toFieldErrors(result.error).message);
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      queryClient.setQueryData(['inquiries', id], await api.sendInquiryMessage(id, result.data));
      void queryClient.invalidateQueries({ queryKey: ['inquiries'], exact: true });
      setDraft('');
      toast('Message sent. The landlord will see it with their inquiries.');
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : 'Please try again.', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function sendOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!busy) void send();
    }
  }

  return (
    <form
      className="flex flex-col gap-1 border-t border-line p-4"
      onSubmit={(event) => void send(event)}
      noValidate
    >
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="student-msg">
          {t('Message to the landlord')}
        </label>
        <textarea
          id="student-msg"
          className="textarea min-h-12! flex-1 resize-none"
          rows={2}
          value={draft}
          maxLength={2000}
          placeholder={t('Type a message…')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'student-msg-err student-msg-help' : 'student-msg-help'}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={sendOnEnter}
        />
        <button
          type="submit"
          className={`${buttonClass()} size-12! flex-none p-0!`}
          aria-label={t('Send message')}
          disabled={busy}
        >
          <Icon name="send" />
        </button>
      </div>
      {error && (
        <p className="t-help font-semibold text-red-text" id="student-msg-err">
          <Icon name="alert" /> {tNode(error)}
        </p>
      )}
      <p className="t-help m-0" id="student-msg-help">
        {t('Press Enter to send. Press Shift and Enter for a new line.')}
      </p>
    </form>
  );
}

function Conversation({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: thread, error, refetch } = useInquiryConversation(id);
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = thread?.messages.at(-1)?.id;

  // Open at the newest message.
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lastId]);

  const back = (
    <button
      type="button"
      className="icon-btn tablet:hidden"
      aria-label={t('Back to all inquiries')}
      onClick={onClose}
    >
      <Icon name="chevL" />
    </button>
  );

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="p-5">
        {tNode(back)}
        <EmptyState
          icon="message"
          title={t('This conversation could not be found.')}
          text={t('Choose another inquiry from your list.')}
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-5">
        {tNode(back)}
        <ErrorState
          icon="wifi"
          title={t('Unable to load this conversation.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      </div>
    );
  }
  if (!thread) {
    return (
      <div
        className="stack-sm p-5"
        role="status"
        aria-busy="true"
        aria-label={t('Loading conversation')}
      >
        <Skeleton height={48} />
        <Skeleton height={160} />
      </div>
    );
  }

  const { landlord, property, replied, messages } = thread;

  return (
    <section className="flex min-h-0 flex-col" aria-labelledby="conv-title">
      <div className="flex items-center gap-3 border-b border-line p-4">
        {tNode(back)}
        <span
          className="grid size-11 flex-none place-items-center rounded-full bg-blue-50 font-semibold text-blue-700"
          aria-hidden="true"
        >
          {initials(landlord)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <h2 className="m-0 truncate text-[1.0625rem] font-semibold" id="conv-title">
            {tNode(landlord)}
          </h2>
          <span className="truncate text-sm text-muted">
            {t('Landlord · about')}{' '}
            <Link to={`/properties/${property.id}`}>{tNode(property.title)}</Link>
          </span>
        </span>
        <span className="max-phone:hidden">
          <ReplyBadge replied={replied} />
        </span>
      </div>
      <div
        ref={scroller}
        className="thread min-h-0 flex-1 overflow-y-auto bg-surface p-5"
        role="log"
        aria-label={t('Messages with {landlord}', { landlord })}
        // Focusable so keyboard users can scroll back through older messages.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {messages.map(({ id: messageId, body, fromLandlord, createdAt }, index) => {
          const day = formatDay(createdAt);
          const newDay = index === 0 || formatDay(messages[index - 1]?.createdAt ?? '') !== day;
          return (
            <Fragment key={messageId}>
              {newDay && (
                <p className="t-support my-2! flex items-center gap-3 text-center before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                  {tNode(day)}
                </p>
              )}
              {fromLandlord ? (
                <div className="flex max-w-[85%] items-end gap-2 self-start">
                  <span
                    className="grid size-9 flex-none place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700"
                    aria-hidden="true"
                  >
                    {initials(landlord)}
                  </span>
                  <div className="bubble in max-w-none! rounded-bl-sm! border border-line bg-card! whitespace-pre-wrap">
                    <span className="sr-only">{tNode(landlord)}: </span>
                    {tNode(body)}
                    <small>{tNode(formatTime(createdAt))}</small>
                  </div>
                </div>
              ) : (
                <div className="bubble out max-w-[75%]! rounded-br-sm! border-0! bg-blue! whitespace-pre-wrap text-white [&_small]:text-right [&_small]:text-white">
                  <span className="sr-only">{t('You:')} </span>
                  {tNode(body)}
                  <small>{tNode(formatTime(createdAt))}</small>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      <Composer id={id} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="t-help m-0">
          {replied
            ? t('The landlord has replied. Ask them to confirm availability before you visit.')
            : t('Landlords usually reply within a few days.')}
        </p>
        <Link
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
          to={`/properties/${property.id}`}
        >
          <Icon name="eye" />
          {t('View property')}
        </Link>
      </div>
    </section>
  );
}

export function StudentInquiriesPage() {
  const [params, setParams] = useSearchParams();
  const open = params.get('open');
  const { data: inquiries, isError, refetch } = useInquiries();

  function show(id: string | null) {
    setParams(id ? { open: id } : {}, { replace: true });
  }

  function content() {
    if (isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load your inquiries.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (!inquiries) {
      return (
        <div
          className="stack-sm"
          role="status"
          aria-busy="true"
          aria-label={t('Loading your inquiries')}
        >
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
      );
    }
    if (inquiries.length === 0) {
      return (
        <EmptyState
          icon="message"
          title={t('No inquiries yet')}
          text={t('Messages you send to landlords will appear here.')}
          actions={
            <Link className={buttonClass()} to="/search">
              {t('Find accommodation')}
            </Link>
          }
        />
      );
    }
    return (
      <div
        className={`grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-card tablet:h-[calc(100dvh-16rem)] tablet:min-h-[560px] tablet:grid-cols-[360px_minmax(0,1fr)] max-tablet:h-[calc(100dvh-18rem)] max-tablet:min-h-[520px] ${open ? 'max-tablet:[&>section:first-child]:hidden' : ''}`}
      >
        <section
          className="flex min-h-0 flex-col border-r border-line max-tablet:border-r-0"
          aria-label={t('Your inquiries')}
        >
          <p className="m-0 border-b border-line px-4 py-3 text-sm font-semibold text-muted">
            {tNode(inquiries.length)} {inquiries.length === 1 ? 'conversation' : 'conversations'}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {inquiries.map((inquiry) => (
              <InquiryRow
                key={inquiry.id}
                inquiry={inquiry}
                selected={inquiry.id === open}
                onOpen={() => show(inquiry.id)}
              />
            ))}
          </div>
        </section>
        {open ? (
          <Conversation key={open} id={open} onClose={() => show(null)} />
        ) : (
          <div className="grid place-items-center p-6 max-tablet:hidden">
            <div className="state split-state">
              <div className="state-ic">
                <Icon name="message" />
              </div>
              <h2 className="state-title">{t('Select an inquiry')}</h2>
              <p>{t('Choose an inquiry on the left to read the conversation.')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('My inquiries')}</h1>
          <p className="muted m-0">{t('Messages you sent to landlords, and their replies.')}</p>
        </div>
      </div>
      {content()}
    </main>
  );
}
