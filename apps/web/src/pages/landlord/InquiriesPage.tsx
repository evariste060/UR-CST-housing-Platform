import { useQueryClient } from '@tanstack/react-query';
import {
  replySchema,
  toFieldErrors,
  type InquiryFilter,
  type InquiryStatus,
  type InquiryThread,
  type LandlordInquiry,
} from '@urcst/shared';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { InquiryBadge } from '../../components/InquiryBadge';
import { Pagination } from '../../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import { formatDay, formatRwf, formatTime, formatWhen, initials } from '../../lib/format';
import { useFocusTrap } from '../../lib/useFocusTrap';
import { PropertyThumb } from '../../landlord/ListingStatusBadge';
import {
  INQUIRY_PAGE_SIZE,
  LANDLORD_KEY,
  threadKey,
  useInquiryThread,
  useLandlordInquiries,
} from '../../landlord/queries';
import { listingLinks } from '../../landlord/useListingActions';
import { t, tNode } from '../../i18n';

const FILTERS: { value: InquiryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'handled', label: 'Handled' },
];

const STATUSES: { value: InquiryStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'HANDLED', label: 'Handled' },
];

const PREVIEW_LENGTH = 60;
const CHOICE =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card px-4 text-base font-semibold text-ink hover:border-blue aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white';

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`grid flex-none place-items-center rounded-full bg-blue-50 font-semibold text-blue-700 ${size === 'sm' ? 'size-9 text-sm' : 'size-11'}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

function useUpdateThread(id: string) {
  const queryClient = useQueryClient();

  return async (thread: InquiryThread) => {
    queryClient.setQueryData(threadKey(id), thread);
    await queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });
  };
}

/* ---------- The conversation list ---------- */

function ConversationRow({
  inquiry,
  selected,
  onOpen,
}: {
  inquiry: LandlordInquiry;
  selected: boolean;
  onOpen: () => void;
}) {
  const { student, property, status, lastMessage } = inquiry;
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
      <Avatar name={student} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <b className={`truncate ${status === 'NEW' ? 'text-ink' : 'font-medium!'}`}>
            {tNode(student)}
          </b>
          <span className="num flex-none text-sm text-muted">
            {tNode(formatWhen(lastMessage.createdAt))}
          </span>
        </span>
        <span className="truncate text-sm font-medium text-muted">{tNode(property.title)}</span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-[0.9375rem] ${status === 'NEW' ? 'font-medium text-ink' : 'text-muted'}`}
          >
            {lastMessage.fromLandlord && t('You: ')}
            {tNode(preview)}
          </span>
          {status === 'NEW' && (
            <span className="size-2.5 flex-none rounded-full bg-blue" aria-hidden="true" />
          )}
        </span>
        <span className="sr-only">{status === 'NEW' ? t('New') : t('Handled')}</span>
      </span>
    </button>
  );
}

function ConversationList({
  filter,
  q,
  page,
  open,
  onFilter,
  onSearch,
  onPage,
  onOpen,
}: {
  filter: InquiryFilter;
  q: string;
  page: number;
  open: string | null;
  onFilter: (filter: InquiryFilter) => void;
  onSearch: (q: string) => void;
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  const list = useLandlordInquiries(filter, page, q);
  const data = list.data;

  function items() {
    if (list.isError) {
      return (
        <ErrorState
          icon="wifi"
          title={t('Unable to load inquiries. Please try again.')}
          text={t('Check your internet connection, then try again.')}
          actions={
            <Button icon="refresh" onClick={() => void list.refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      );
    }
    if (!data) {
      return (
        <div
          className="stack-sm p-4"
          role="status"
          aria-busy="true"
          aria-label={t('Loading inquiries')}
        >
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      );
    }
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon="message"
          title={
            q
              ? t('No conversations match your search')
              : filter === 'all'
                ? t('No inquiries yet')
                : t('No {filter} inquiries', { filter })
          }
          text={
            q
              ? t('Try a different student name or property.')
              : t('When students contact you about a listing, their messages appear here.')
          }
          actions={
            (filter !== 'all' || q) && (
              <Button
                variant="secondary"
                onClick={() => {
                  onSearch('');
                  onFilter('all');
                }}
              >
                {t('Show all')}
              </Button>
            )
          }
        />
      );
    }
    return (
      <>
        <div aria-busy={list.isPlaceholderData}>
          {data.items.map((inquiry) => (
            <ConversationRow
              key={inquiry.id}
              inquiry={inquiry}
              selected={inquiry.id === open}
              onOpen={() => onOpen(inquiry.id)}
            />
          ))}
        </div>
        <div className="p-4">
          <Pagination
            compact
            page={data.page}
            pageSize={INQUIRY_PAGE_SIZE}
            total={data.total}
            noun={t('conversations')}
            label={t('Conversation pages')}
            onChange={onPage}
          />
        </div>
      </>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-col border-r border-line max-tablet:border-r-0"
      aria-label={t('Conversations')}
    >
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div
          className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1"
          role="group"
          aria-label={t('Filter inquiries')}
        >
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm border-0 bg-transparent px-1 font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-blue aria-pressed:text-white aria-pressed:shadow-soft"
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
            >
              {filter === value && <Icon name="check" />}
              {tNode(label)}
              {data && <span className="num text-sm">{tNode(data.counts[value])}</span>}
            </button>
          ))}
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="inq-q">
            {t('Search conversations')}
          </label>
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted">
            <Icon name="search" />
          </span>
          <input
            id="inq-q"
            className="input pl-10!"
            type="search"
            maxLength={100}
            value={q}
            placeholder={t('Search by student or property')}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{tNode(items())}</div>
    </section>
  );
}

/* ---------- The conversation ---------- */

function Composer({
  id,
  draft,
  onDraft,
}: {
  id: string;
  draft: string;
  onDraft: (text: string) => void;
}) {
  const toast = useToast();
  const update = useUpdateThread(id);
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
      await update(await api.replyToInquiry(id, result.data));
      onDraft('');
      toast('Reply sent and marked as handled.');
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
        <label className="sr-only" htmlFor="reply-msg">
          {t('Reply')}
        </label>
        <textarea
          id="reply-msg"
          className="textarea min-h-12! flex-1 resize-none"
          rows={2}
          value={draft}
          maxLength={2000}
          placeholder={t('Type a message…')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'reply-err reply-help' : 'reply-help'}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={sendOnEnter}
        />
        <button
          type="submit"
          className={`${buttonClass()} size-12! flex-none p-0!`}
          aria-label={t('Send reply')}
          disabled={busy}
        >
          <Icon name="send" />
        </button>
      </div>
      {error && (
        <p className="t-help font-semibold text-red-text" id="reply-err">
          <Icon name="alert" /> {tNode(error)}
        </p>
      )}
      <p className="t-help m-0" id="reply-help">
        {t('Press Enter to send. Press Shift and Enter for a new line.')}
      </p>
    </form>
  );
}

function Messages({ thread }: { thread: InquiryThread }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { messages, student } = thread;
  const lastId = messages.at(-1)?.id;

  // Open at the newest message, and follow new ones as they arrive.
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lastId]);

  return (
    <div
      ref={scroller}
      className="thread min-h-0 flex-1 overflow-y-auto bg-surface p-5"
      role="log"
      aria-label={t('Messages with {student}', { student })}
      // Focusable so keyboard users can scroll back through older messages.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {messages.map(({ id, body, fromLandlord, createdAt }, index) => {
        const day = formatDay(createdAt);
        const newDay = index === 0 || formatDay(messages[index - 1]?.createdAt ?? '') !== day;
        return (
          <Fragment key={id}>
            {newDay && (
              <p className="t-support my-2! flex items-center gap-3 text-center before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
                {tNode(day)}
              </p>
            )}
            {fromLandlord ? (
              <div className="bubble out max-w-[75%]! rounded-br-sm! border-0! bg-blue! whitespace-pre-wrap text-white [&_small]:text-white">
                <span className="sr-only">{t('You:')} </span>
                {tNode(body)}
                <small className="text-right">{tNode(formatTime(createdAt))}</small>
              </div>
            ) : (
              <div className="flex max-w-[85%] items-end gap-2 self-start">
                <Avatar name={student} size="sm" />
                <div className="bubble in max-w-none! rounded-bl-sm! border border-line bg-card! whitespace-pre-wrap">
                  <span className="sr-only">{tNode(student)}: </span>
                  {tNode(body)}
                  <small>{tNode(formatTime(createdAt))}</small>
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function Details({ thread }: { thread: InquiryThread }) {
  const toast = useToast();
  const update = useUpdateThread(thread.id);
  const { student, property, status } = thread;
  const { view } = listingLinks(property);

  async function setStatus(next: InquiryStatus) {
    if (next === status) return;
    try {
      await update(await api.setInquiryStatus(thread.id, next));
      toast(next === 'HANDLED' ? 'Marked as handled.' : 'Marked as new.');
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : 'Please try again.', { type: 'error' });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2" aria-labelledby="det-student">
        <h3 className="t-label" id="det-student">
          {t('Student Information')}
        </h3>
        <div className="flex items-center gap-3">
          <Avatar name={student} />
          <span className="flex flex-col">
            <b>{tNode(student)}</b>
            <span className="t-support">{t('Student')}</span>
          </span>
        </div>
        <p className="t-help m-0">
          <Icon name="lock" /> {t('Contact details are kept private. Reply in this conversation.')}
        </p>
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="det-property">
        <h3 className="t-label" id="det-property">
          {t('Related Property')}
        </h3>
        <div className="flex gap-3">
          <PropertyThumb url={property.coverUrl} size="lg" />
          <span className="flex min-w-0 flex-col">
            <b className="wrap-anywhere">{tNode(property.title)}</b>
            {property.area && (
              <span className="t-support inline-flex items-center gap-1">
                <Icon name="pin" />
                {tNode(property.area)}
              </span>
            )}
            <span className="num font-semibold text-blue-700">
              {formatRwf(property.rentRwf)} {t('/ month')}
            </span>
          </span>
        </div>
        <Link className={`${buttonClass({ variant: 'secondary', block: true })}`} to={view}>
          <Icon name="eye" />
          {t('View Property')}
        </Link>
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="det-status">
        <h3 className="t-label" id="det-status">
          {t('Inquiry Status')}
        </h3>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="det-status">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={CHOICE}
              aria-pressed={status === value}
              onClick={() => void setStatus(value)}
            >
              {status === value && <Icon name="check" />}
              {tNode(label)}
            </button>
          ))}
        </div>
        <p className="t-help m-0">
          {t('Selected:')} {status === 'NEW' ? t('New') : t('Handled')}
          {t('. Sending a reply marks it as handled.')}
        </p>
      </section>
    </div>
  );
}

function DetailsDrawer({ thread, onClose }: { thread: InquiryThread; onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  useFocusTrap(sheet, { onEscape: onClose });

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="fixed inset-0 z-70 bg-[rgba(15,23,42,0.5)]" onClick={closeOnBackdrop}>
      <div
        ref={sheet}
        className="absolute inset-y-0 right-0 flex w-[min(360px,90%)] flex-col gap-4 overflow-y-auto bg-card p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="det-title"
      >
        <div className="row-between">
          <h2 className="t-section" id="det-title">
            {t('Inquiry details')}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('Close details')}
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <Details thread={thread} />
      </div>
    </div>
  );
}

function Conversation({
  id,
  draft,
  onDraft,
  onBack,
}: {
  id: string;
  draft: string;
  onDraft: (text: string) => void;
  onBack: () => void;
}) {
  const { data: thread, isError, refetch } = useInquiryThread(id);
  const [details, setDetails] = useState(false);
  const detailsButton = useRef<HTMLButtonElement>(null);

  if (isError) {
    return (
      <div className="p-4">
        <ErrorState
          icon="wifi"
          title={t('Unable to load this conversation. Please try again.')}
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
        className="stack-sm p-4"
        role="status"
        aria-busy="true"
        aria-label={t('Loading this conversation')}
      >
        <Skeleton height={48} />
        <Skeleton height={160} />
      </div>
    );
  }

  return (
    <>
      <section className="flex min-h-0 flex-col" aria-labelledby="chat-title">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <button
            type="button"
            className="icon-btn tablet:hidden"
            aria-label={t('Back to all conversations')}
            onClick={onBack}
          >
            <Icon name="chevL" />
          </button>
          <Avatar name={thread.student} />
          <span className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-[1.0625rem] font-semibold" id="chat-title">
              {tNode(thread.student)}
            </h2>
            <span className="t-support truncate">
              {t('Student · about')} {tNode(thread.property.title)}
            </span>
          </span>
          <span className="max-phone:hidden">
            <InquiryBadge status={thread.status} />
          </span>
          <Button
            ref={detailsButton}
            className="min-[1440px]:hidden"
            variant="secondary"
            size="sm"
            icon="info"
            aria-expanded={details}
            onClick={() => setDetails(true)}
          >
            <span className="max-phone:sr-only">{t('Details')}</span>
          </Button>
        </div>
        <Messages thread={thread} />
        <Composer id={id} draft={draft} onDraft={onDraft} />
      </section>
      <aside
        className="hidden min-h-0 overflow-y-auto border-l border-line p-5 min-[1440px]:block"
        aria-label={t('Inquiry details')}
      >
        <Details thread={thread} />
      </aside>
      {details && (
        <DetailsDrawer
          thread={thread}
          onClose={() => {
            setDetails(false);
            detailsButton.current?.focus();
          }}
        />
      )}
    </>
  );
}

/* ---------- The page ---------- */

export function InquiriesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const filter: InquiryFilter = raw === 'new' || raw === 'handled' ? raw : 'all';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const open = params.get('open');
  // Unsent replies, kept per conversation while you switch between them.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function show(next: { status?: InquiryFilter; q?: string; page?: number; open?: string | null }) {
    const status = next.status ?? filter;
    const search = next.q ?? q;
    const listChanged = next.status !== undefined || next.q !== undefined;
    const nextPage = next.page ?? (listChanged ? 1 : page);
    const opened = next.open === undefined ? open : next.open;
    setParams(
      {
        ...(status !== 'all' && { status }),
        ...(search && { q: search }),
        ...(nextPage > 1 && { page: String(nextPage) }),
        ...(opened && { open: opened }),
      },
      { replace: true },
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Student Inquiries')}</h1>
          <p className="muted m-0">{t('Messages and accommodation requests from students.')}</p>
        </div>
      </div>
      <div
        className={`grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-card tablet:h-[calc(100dvh-14rem)] tablet:min-h-[560px] tablet:grid-cols-[320px_minmax(0,1fr)] min-[1440px]:grid-cols-[340px_minmax(0,1fr)_300px] max-tablet:h-[calc(100dvh-16rem)] max-tablet:min-h-[520px] ${open ? 'max-tablet:[&>section:first-child]:hidden' : ''}`}
      >
        <ConversationList
          filter={filter}
          q={q}
          page={page}
          open={open}
          onFilter={(status) => show({ status })}
          onSearch={(search) => show({ q: search })}
          onPage={(nextPage) => show({ page: nextPage })}
          onOpen={(id) => show({ open: id })}
        />
        {open ? (
          <Conversation
            key={open}
            id={open}
            draft={drafts[open] ?? ''}
            onDraft={(text) => setDrafts((current) => ({ ...current, [open]: text }))}
            onBack={() => show({ open: null })}
          />
        ) : (
          <div className="grid place-items-center p-6 max-tablet:hidden min-[1440px]:col-span-2">
            <div className="state split-state">
              <div className="state-ic">
                <Icon name="message" />
              </div>
              <h2 className="state-title">{t('Select a conversation')}</h2>
              <p>{t('Choose a student on the left to read their messages and reply.')}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
