import {
  REPORT_REASON_LABELS,
  reportReasonSchema,
  type PropertySummary,
  type ReportReason,
} from '@urcst/shared';
import { useState } from 'react';
import { ApiError, api } from '../lib/api';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { PickGroup } from './PickGroup';
import { useToast } from './Toast';
import { t, tNode } from '../i18n';

const REASONS = reportReasonSchema.options.map((value) => ({
  value,
  label: REPORT_REASON_LABELS[value],
}));

export function ReportDialog({
  property,
  onClose,
}: {
  property: Pick<PropertySummary, 'id' | 'title'>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason>();
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) {
      setError('Please choose what is wrong.');
      return;
    }
    setBusy(true);
    try {
      await api.reportProperty(property.id, { reason, details: details.trim() || undefined });
      onClose();
      toast('Thank you. Your report was sent to administrators.');
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Please try again.');
      setBusy(false);
    }
  }

  return (
    <Modal
      alert
      title={t('Report a problem with "{title}"', { title: property.title })}
      icon="flag"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void send()}>
            {t('Send report')}
          </Button>
        </>
      }
    >
      <p>
        {t('Administrators will check the listing. Your name is shared with administrators only.')}
      </p>
      <PickGroup
        label={t('What is wrong?')}
        value={reason}
        options={REASONS}
        none={t('Nothing yet')}
        compact
        onChange={(value) => {
          setReason(value);
          setError('');
        }}
      />
      <div className="field">
        <label htmlFor="report-details">{t('Details (optional)')}</label>
        <textarea
          className="textarea"
          id="report-details"
          value={details}
          placeholder={t('Tell us what you noticed.')}
          onChange={(event) => setDetails(event.target.value)}
        />
      </div>
      {error && (
        <p className="err-msg" role="alert">
          <Icon name="alert" />
          {tNode(error)}
        </p>
      )}
    </Modal>
  );
}
