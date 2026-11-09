import { useRef, useState } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Modal, type ModalTone } from './Modal';
import { t, tNode } from '../i18n';

interface NoteField {
  label: string;
  placeholder?: string;
  /** Shown when the note is required and left empty. */
  required?: string;
  /** Starts the note with this text, which can be changed. */
  initial?: string;
}

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirm?: string;
  tone?: ModalTone;
  icon?: IconName;
  /** Asks for a note, for example the reason for rejecting a listing. */
  field?: NoteField;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirm = 'Confirm',
  tone = 'primary',
  icon = 'info',
  field,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [note, setNote] = useState(field?.initial ?? '');
  const [error, setError] = useState('');
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  function handleConfirm() {
    if (field?.required && !note.trim()) {
      setError(field.required);
      noteInput.current?.focus();
      return;
    }
    onConfirm(note.trim());
  }

  return (
    <Modal
      alert
      title={title}
      icon={icon}
      tone={tone}
      onClose={onCancel}
      initialFocus={() => noteInput.current ?? confirmButton.current}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('Cancel')}
          </Button>
          <Button ref={confirmButton} variant={tone} onClick={handleConfirm}>
            {tNode(confirm)}
          </Button>
        </>
      }
    >
      <p>{tNode(body)}</p>
      {field && (
        <div className={error ? 'field has-error' : 'field'}>
          <label htmlFor="confirm-note">
            {tNode(field.label)}
            {field.required && (
              <>
                {' '}
                <span className="req" aria-hidden="true">
                  *
                </span>
              </>
            )}
          </label>
          <textarea
            ref={noteInput}
            className="textarea"
            id="confirm-note"
            value={note}
            placeholder={tNode(field.placeholder)}
            aria-required={field.required ? true : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'confirm-note-err' : undefined}
            onChange={(event) => {
              setNote(event.target.value);
              setError('');
            }}
          />
          {error && (
            <p className="err-msg" id="confirm-note-err">
              <Icon name="alert" />
              {tNode(error)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
