import { useState } from 'react';
import { Badge, ReviewBadge, type ReviewStatus } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { IconName } from '../components/Icon';
import type { ModalTone } from '../components/Modal';
import { api } from '../lib/api';
import { useAdminAction } from './queries';
import { t } from '../i18n';

export type ModerationKind = 'approve' | 'changes' | 'reject' | 'remove';

interface Target {
  id: string;
  title: string;
  /** Resolves this report when the listing is removed. */
  reportId?: string;
}

interface Config {
  title: (name: string) => string;
  body: string;
  confirm: string;
  tone: ModalTone;
  icon: IconName;
  field?: { label: string; placeholder: string; required: string };
  success: string;
}

const CONFIG: Record<ModerationKind, Config> = {
  approve: {
    title: (name) => `Approve "${name}"?`,
    body: 'Students will be able to see this listing and contact the landlord. Approval does not confirm that the room is free today.',
    confirm: 'Approve listing',
    tone: 'success',
    icon: 'shieldcheck',
    success: 'Listing approved. Students can see it now.',
  },
  changes: {
    title: (name) => `Request changes to "${name}"?`,
    body: 'The listing stays hidden from students. The landlord will see your note.',
    confirm: 'Send request',
    tone: 'primary',
    icon: 'edit',
    field: {
      label: 'What should the landlord change?',
      placeholder:
        'e.g. Please add a photo of the bathroom and confirm if electricity is included.',
      required: 'Please write a short note for the landlord.',
    },
    success: 'Changes requested. The landlord has been notified.',
  },
  reject: {
    title: (name) => `Reject "${name}"?`,
    body: 'The listing will not be shown to students. The landlord will see your reason.',
    confirm: 'Reject listing',
    tone: 'danger',
    icon: 'x',
    field: {
      label: 'Reason for rejection',
      placeholder: 'e.g. The location is outside the pilot area.',
      required: 'Please write a short note for the landlord.',
    },
    success: 'Listing rejected. The landlord has been notified.',
  },
  remove: {
    title: (name) => `Remove "${name}"?`,
    body: 'Students will no longer see this listing, and it leaves their saved lists. The landlord will be told why.',
    confirm: 'Remove listing',
    tone: 'danger',
    icon: 'trash',
    field: {
      label: 'Reason (shown to landlord)',
      placeholder: 'e.g. The listing information was found to be incorrect.',
      required: 'Please add a reason.',
    },
    success: 'Listing removed. The landlord has been notified.',
  },
};

function run(kind: ModerationKind, { id, reportId }: Target, note: string) {
  if (kind === 'approve') return api.approveListing(id);
  if (kind === 'changes') return api.requestChanges(id, note);
  if (kind === 'reject') return api.rejectListing(id, note);
  return api.removeListing(id, note, reportId);
}

/** Confirmed approve, request changes, reject and remove, with a note where one is needed. */
export function useModeration(onDone?: (kind: ModerationKind) => void) {
  const [open, setOpen] = useState<{ kind: ModerationKind; target: Target } | null>(null);
  const act = useAdminAction(
    ({ kind, target, note }: { kind: ModerationKind; target: Target; note: string }) =>
      run(kind, target, note),
  );

  const config = open && CONFIG[open.kind];
  const dialog = open && config && (
    <ConfirmDialog
      title={config.title(open.target.title)}
      body={config.body}
      confirm={config.confirm}
      tone={config.tone}
      icon={config.icon}
      field={
        config.field && {
          ...config.field,
          initial: open.target.reportId
            ? 'Removed after a student report was confirmed.'
            : undefined,
        }
      }
      onCancel={() => setOpen(null)}
      onConfirm={(note) => {
        const { kind, target } = open;
        setOpen(null);
        act({ kind, target, note }, config.success, () => onDone?.(kind));
      }}
    />
  );

  return {
    ask: (kind: ModerationKind, target: Target) => setOpen({ kind, target }),
    dialog,
  };
}

/** Administrators see every status, including Approved, which other people do not get a badge for. */
export function AdminReviewBadge({ status }: { status: ReviewStatus }) {
  return status === 'APPROVED' ? (
    <Badge tone="approved" icon="shieldcheck">
      {t('Approved')}
    </Badge>
  ) : (
    <ReviewBadge status={status} />
  );
}
