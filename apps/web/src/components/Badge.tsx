import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type Availability = 'AVAILABLE' | 'OCCUPIED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'REMOVED';

export function Badge({
  tone,
  icon,
  children,
}: {
  tone: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={`badge b-${tone}`}>
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

const REVIEW: Record<ReviewStatus, { tone: string; icon: IconName; label: string }> = {
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
