import { useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { t, tNode } from '../i18n';

export type ModalTone = 'primary' | 'danger' | 'success';

interface ModalProps {
  title: string;
  icon?: IconName;
  tone?: ModalTone;
  wide?: boolean;
  /** Use for questions that need an answer. Screen readers announce these at once. */
  alert?: boolean;
  footer: ReactNode;
  children: ReactNode;
  onClose: () => void;
  initialFocus?: () => HTMLElement | null;
}

export function Modal({
  title,
  icon = 'info',
  tone = 'primary',
  wide = false,
  alert = false,
  footer,
  children,
  onClose,
  initialFocus,
}: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useFocusTrap(dialog, { onEscape: onClose, initialFocus });

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  const iconTone = { primary: '', danger: 'danger', success: 'ok' }[tone];

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="overlay" onClick={closeOnBackdrop}>
      <div
        ref={dialog}
        className={wide ? 'modal wide' : 'modal'}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mh">
          <div className={`m-ic ${iconTone}`}>
            <Icon name={icon} />
          </div>
          <h2 id={titleId}>{tNode(title)}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('Close dialog')}
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="mb">{children}</div>
        <div className="mf">{tNode(footer)}</div>
      </div>
    </div>
  );
}

export type InfoTopic = 'about' | 'privacy' | 'terms';

const INFO: Record<InfoTopic, { title: string; body: string }> = {
  about: {
    title: 'About the platform',
    body: 'UR-CST Housing is a pilot that brings accommodation information near the College of Science and Technology into one place. Students can search, compare and contact landlords. Landlords publish listings, and administrators review them. It does not handle rent payment, bookings or contracts.',
  },
  privacy: {
    title: 'Privacy',
    body: "Landlords' phone numbers are shown only on their listings, students' messages are visible only to the landlord they contact, and accounts can be deleted on request.",
  },
  terms: {
    title: 'Terms',
    body: 'Listings are provided by landlords and checked by administrators, but students should visit a place and agree terms directly with the landlord before paying. The platform is not a party to any rental agreement.',
  },
};

export function InfoDialog({ topic, onClose }: { topic: InfoTopic; onClose: () => void }) {
  const { title, body } = INFO[topic];
  return (
    <Modal title={title} onClose={onClose} footer={<Button onClick={onClose}>{t('Close')}</Button>}>
      <p>{tNode(body)}</p>
    </Modal>
  );
}
