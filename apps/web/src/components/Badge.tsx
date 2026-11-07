import type { Availability, ReviewStatus } from '@urcst/shared';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type { Availability, ReviewStatus };

const TONES = {
  available: 'border-[#a7e3bc] bg-green-50 text-green-text dark:border-[#1f5a37]',
  occupied: 'border-line-strong bg-slate-100 text-[#334155] dark:text-ink',
  pending: 'border-amber-border bg-amber-50 text-amber-text',
  changes: 'border-amber-border bg-amber-50 text-amber-text',
  approved: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-[#2a4a86]',
  new: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-[#2a4a86]',
  rejected: 'border-red-border bg-red-50 text-red-text',
  removed: 'border-red-border bg-red-50 text-red-text',
  suspended: 'border-red-border bg-red-50 text-red-text',
  neutral: 'border-line bg-card text-muted',
  demo: 'border-line bg-slate-100 text-muted',
};

export type BadgeTone = keyof typeof TONES;

/** `badge` carries no style of its own: parents use it to place the badges inside them. */
export function badgeClass(tone: BadgeTone) {
  const weight = tone === 'demo' ? 'font-medium' : 'font-semibold';
  return `badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] leading-[1.3] whitespace-nowrap high-contrast:border-2 [&_.ic]:size-3.5 ${weight} ${TONES[tone]}`;
}

export function Badge({
  tone,
  icon,
  children,
}: {
  tone: BadgeTone;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={badgeClass(tone)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** Set by the landlord. Always shown apart from ReviewBadge, which an administrator sets. */
export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return availability === 'AVAILABLE' ? (
    <Badge tone="available" icon="check">
      Available
    </Badge>
  ) : (
    <Badge tone="occupied" icon="door">
      Occupied
    </Badge>
  );
}

const REVIEW: Record<ReviewStatus, { tone: BadgeTone; icon: IconName; label: string }> = {
  DRAFT: { tone: 'neutral', icon: 'edit', label: 'Draft' },
  APPROVED: { tone: 'approved', icon: 'shieldcheck', label: 'Approved by admin' },
  PENDING: { tone: 'pending', icon: 'clock', label: 'Pending review' },
  CHANGES_REQUESTED: { tone: 'changes', icon: 'edit', label: 'Changes requested' },
  REJECTED: { tone: 'rejected', icon: 'x', label: 'Rejected' },
  REMOVED: { tone: 'removed', icon: 'trash', label: 'Removed by admin' },
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const { tone, icon, label } = REVIEW[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
