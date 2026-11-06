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
      title={`Report a problem with "${property.title}"`}
      icon="flag"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void send()}>
            Send report
          </Button>
        </>
      }
    >
      <p>Administrators will check the listing. Your name is shared with administrators only.</p>
      <PickGroup
        label="What is wrong?"
        value={reason}
        options={REASONS}
        none="Nothing yet"
        compact
        onChange={(value) => {
          setReason(value);
          setError('');
        }}
      />
      <div className="field">
        <label htmlFor="report-details">Details (optional)</label>
        <textarea
          className="textarea"
          id="report-details"
          value={details}
          placeholder="Tell us what you noticed."
          onChange={(event) => setDetails(event.target.value)}
        />
      </div>
      {error && (
        <p className="err-msg" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </Modal>
  );
}
