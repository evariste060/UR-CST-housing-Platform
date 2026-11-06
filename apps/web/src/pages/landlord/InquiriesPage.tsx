import { useQueryClient } from '@tanstack/react-query';
import { replySchema, toFieldErrors, type InquiryFilter, type InquiryThread } from '@urcst/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { InquiryBadge } from '../../components/InquiryBadge';
import { EmptyState, ErrorState, Skeleton } from '../../components/StateBlocks';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import { formatDate, initials } from '../../lib/format';
import {
  LANDLORD_KEY,
  threadKey,
  useInquiryThread,
  useLandlordInquiries,
} from '../../landlord/queries';

const FILTERS: { value: InquiryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'handled', label: 'Handled' },
];

function useUpdateThread(id: string) {
  const queryClient = useQueryClient();

  return async (thread: InquiryThread) => {
    queryClient.setQueryData(threadKey(id), thread);
    await queryClient.invalidateQueries({ queryKey: LANDLORD_KEY });
  };
}

function ReplyForm({ id }: { id: string }) {
  const toast = useToast();
  const update = useUpdateThread(id);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const result = replySchema.safeParse({ message: reply });
    if (!result.success) {
      setError(toFieldErrors(result.error).message);
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      await update(await api.replyToInquiry(id, result.data));
      setReply('');
      toast('Reply sent and marked as handled.');
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : 'Please try again.', { type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack-sm" onSubmit={(event) => void send(event)} noValidate>
      <Field
        id="reply-msg"
        label="Reply"
        rows={3}
        value={reply}
        placeholder="e.g. Yes, the room is available. You can visit on Saturday at 10 am."
        maxLength={2000}
        error={error}
        onChange={setReply}
      />
      <div className="row">
        <Button type="submit" icon="send" disabled={busy}>
          Send reply
        </Button>
      </div>
    </form>
  );
}

function Thread({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: thread, isError, refetch } = useInquiryThread(id);
  const toast = useToast();
  const update = useUpdateThread(id);

  if (isError) {
    return (
      <ErrorState
        icon="wifi"
        title="Unable to load this inquiry. Please try again."
        text="Check your internet connection, then try again."
        actions={
          <Button icon="refresh" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!thread) {
    return (
      <div className="stack-sm" role="status" aria-busy="true" aria-label="Loading this inquiry">
        <Skeleton height={48} />
        <Skeleton height={120} />
      </div>
    );
  }

  const { student, property, status, messages } = thread;
  const isNew = status === 'NEW';

  async function toggleStatus() {
    try {
      await update(await api.setInquiryStatus(id, isNew ? 'HANDLED' : 'NEW'));
      toast(isNew ? 'Marked as handled.' : 'Marked as new.');
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : 'Please try again.', { type: 'error' });
    }
  }

  return (
    <>
      <button type="button" className="link-btn mobile-filter-btn" onClick={onClose}>
        <Icon name="chevL" /> All inquiries
      </button>
      <div className="row-between">
        <div className="row">
          <span className="avatar">{initials(student)}</span>
          <span>
            <b>{student}</b>
            <span className="t-support choice-text">
              About <Link to={`/properties/${property.id}`}>{property.title}</Link>
            </span>
          </span>
        </div>
        {isNew ? (
          <Button variant="success" size="sm" icon="check" onClick={() => void toggleStatus()}>
            Mark as handled
          </Button>
        ) : (
          <span className="row">
            <InquiryBadge status={status} />
            <Button variant="ghost" size="sm" onClick={() => void toggleStatus()}>
              Mark as new
            </Button>
          </span>
        )}
      </div>
      <div className="thread">
        {messages.map(({ id: messageId, body, fromLandlord, createdAt }) => (
          <div key={messageId} className={fromLandlord ? 'bubble out' : 'bubble in'}>
            {body}
            <small>
              {fromLandlord ? 'You' : student} · {formatDate(createdAt)}
            </small>
          </div>
        ))}
      </div>
      <ReplyForm key={id} id={id} />
    </>
  );
}

export function InquiriesPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const filter: InquiryFilter = raw === 'new' || raw === 'handled' ? raw : 'all';
  const open = params.get('open');
  const list = useLandlordInquiries(filter);
  const pages = list.data?.pages;
  const items = pages?.flatMap((page) => page.items) ?? [];
  const counts = pages?.[0]?.counts;

  function show(next: { status?: InquiryFilter; open?: string | null }) {
    const status = next.status ?? filter;
    const opened = next.open === undefined ? open : next.open;
    setParams(
      {
        ...(status !== 'all' && { status }),
        ...(opened && { open: opened }),
      },
      { replace: true },
    );
  }

  function content() {
    if (list.isError) {
      return (
        <ErrorState
          icon="wifi"
          title="Unable to load inquiries. Please try again."
          text="Check your internet connection, then try again."
          actions={
            <Button icon="refresh" onClick={() => void list.refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (!pages) {
      return (
        <div className="stack-sm" role="status" aria-busy="true" aria-label="Loading inquiries">
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
      );
    }
    if (items.length === 0 && !open) {
      return (
        <EmptyState
          icon="message"
          title={filter === 'all' ? 'No inquiries yet' : `No ${filter} inquiries`}
          text="When students contact you about a listing, their messages appear here."
          actions={
            filter !== 'all' && (
              <Button variant="secondary" onClick={() => show({ status: 'all' })}>
                Show all
              </Button>
            )
          }
        />
      );
    }
    return (
      <div className={open ? 'split has-open' : 'split'}>
        <div className="left">
          {items.length === 0 && <p className="muted split-empty">No inquiries in this filter.</p>}
          {items.map(({ id, student, property, status, lastMessage, createdAt }) => (
            <button
              key={id}
              type="button"
              className={status === 'NEW' ? 'list-item clickable unread' : 'list-item clickable'}
              aria-current={id === open ? 'true' : undefined}
              onClick={() => show({ open: id })}
            >
              <span className="avatar sm">{initials(student)}</span>
              <span className="grow">
                <span className="row-between">
                  <b>{student}</b>
                  <span className="t-support">{formatDate(createdAt)}</span>
                </span>
                <span className="t-support choice-text">{property.title}</span>
                <span className="inquiry-preview">{lastMessage.body}</span>
                <span className="inquiry-status">
                  <InquiryBadge status={status} />
                </span>
              </span>
            </button>
          ))}
          {list.hasNextPage && (
            <div className="show-more">
              <Button
                variant="secondary"
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                Show more
              </Button>
            </div>
          )}
        </div>
        <div className="right">
          {open ? (
            <Thread key={open} id={open} onClose={() => show({ open: null })} />
          ) : (
            <div className="state split-state">
              <div className="state-ic">
                <Icon name="message" />
              </div>
              <h2 className="state-title">Select an inquiry</h2>
              <p>Choose a message on the left to read and reply.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Student inquiries</h1>
          <p className="muted">Reply to students and mark messages as handled.</p>
        </div>
      </div>
      <div className="seg landlord-tabs" role="group" aria-label="Filter inquiries">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => show({ status: value })}
          >
            {label} {counts && `(${counts[value]})`}
          </button>
        ))}
      </div>
      {content()}
    </main>
  );
}
