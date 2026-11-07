import type { InquiryStatus } from '@urcst/shared';
import { Badge, badgeClass } from './Badge';

export function InquiryBadge({ status }: { status: InquiryStatus }) {
  if (status === 'NEW') {
    return (
      <span className={badgeClass('new')}>
        <span className="dot" aria-hidden="true" />
        New
      </span>
    );
  }
  return (
    <Badge tone="neutral" icon="check">
      Handled
    </Badge>
  );
}
