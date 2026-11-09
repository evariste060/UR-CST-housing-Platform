import type { InquiryStatus } from '@urcst/shared';
import { Badge, badgeClass } from './Badge';
import { t } from '../i18n';

export function InquiryBadge({ status }: { status: InquiryStatus }) {
  if (status === 'NEW') {
    return (
      <span className={badgeClass('new')}>
        <span className="dot" aria-hidden="true" />
        {t('New')}
      </span>
    );
  }
  return (
    <Badge tone="neutral" icon="check">
      {t('Handled')}
    </Badge>
  );
}

export function ReplyBadge({ replied }: { replied: boolean }) {
  return replied ? (
    <Badge tone="available" icon="check">
      {t('Replied')}
    </Badge>
  ) : (
    <Badge tone="pending" icon="clock">
      {t('Awaiting reply')}
    </Badge>
  );
}
