import { changePasswordSchema, toFieldErrors, updateProfileSchema } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';
import { PickGroup } from '../components/PickGroup';
import { useToast } from '../components/Toast';
import { useDisplay } from '../display/DisplayProvider';
import { PREF_LABELS } from '../display/prefs';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';

const SIZE_OPTIONS = Object.entries(PREF_LABELS.size).map(([value, label]) => ({ value, label }));

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useFocusFirstError(form, errors);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = updateProfileSchema.safeParse({ fullName, email, phone });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const { user: updated } = await api.updateProfile(result.data);
      setUser(updated);
      toast('Your details have been saved.');
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={form}
      className="form-grid account-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <Field
        id="ac-name"
        label="Full name"
        value={fullName}
        onChange={setFullName}
        autoComplete="name"
        required
        error={errors.fullName}
      />
      <Field
        id="ac-email"
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        id="ac-phone"
        label="Phone number (optional)"
        type="tel"
        value={phone}
        onChange={setPhone}
        autoComplete="tel"
        error={errors.phone}
      />
      <div className="full">
        <Button type="submit" disabled={busy}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useFocusFirstError(form, errors);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = changePasswordSchema.safeParse({ currentPassword, newPassword });
    const found = result.success ? {} : toFieldErrors(result.error);
    if (!found.newPassword && repeat !== newPassword) found.repeat = 'Passwords do not match.';

    setErrors(found);
    if (!result.success || Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await api.changePassword(result.data);
      setCurrentPassword('');
      setNewPassword('');
      setRepeat('');
      toast('Your password has been changed.');
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={form}
      className="form-grid account-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <div className="full">
        <PasswordField
          id="pw-cur"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          error={errors.currentPassword}
        />
      </div>
      <PasswordField
        id="pw-new"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        help="At least 8 characters."
        error={errors.newPassword}
      />
      <PasswordField
        id="pw-new2"
        label="Confirm new password"
        value={repeat}
        onChange={setRepeat}
        autoComplete="new-password"
        error={errors.repeat}
      />
      <div className="full">
        <Button type="submit" disabled={busy}>
          Update password
        </Button>
      </div>
    </form>
  );
}

function DisplaySection() {
  const { prefs, setPref, setPanelOpen } = useDisplay();

  return (
    <section className="panel" aria-labelledby="ax-h">
      <h2 className="t-section" id="ax-h">
        Display &amp; language
      </h2>
      <PickGroup
        label="Text size"
        value={prefs.size}
        options={SIZE_OPTIONS}
        onChange={(value) => setPref('size', value)}
      />
      <div className="row account-more">
        <Button variant="secondary" icon="palette" onClick={() => setPanelOpen(true)}>
          More display &amp; audio options
        </Button>
        <span className="t-help">
          Font style, line spacing, contrast, highlighting and read-aloud.
        </span>
      </div>
      <hr className="divider" />
      <fieldset className="account-lang">
        <legend className="t-label">
          <Icon name="globe" /> Language
        </legend>
        <label className="check">
          <input type="radio" name="lang" defaultChecked /> English
        </label>
        <label className="check muted">
          <input type="radio" name="lang" disabled /> Kinyarwanda{' '}
          <Badge tone="demo">Planned. Not translated yet</Badge>
        </label>
        <label className="check muted">
          <input type="radio" name="lang" disabled /> Français{' '}
          <Badge tone="demo">Planned. Not translated yet</Badge>
        </label>
      </fieldset>
    </section>
  );
}

export function AccountPage() {
  const logOut = useLogout();

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">Account &amp; preferences</h1>
          <p className="muted">Manage your details, password, accessibility and display.</p>
        </div>
      </div>
      <div className="stack account-stack">
        <section className="panel" aria-labelledby="pi-h">
          <h2 className="t-section" id="pi-h">
            Personal information
          </h2>
          <ProfileForm />
        </section>
        <section className="panel" aria-labelledby="pw-h">
          <h2 className="t-section" id="pw-h">
            Change password
          </h2>
          <PasswordForm />
        </section>
        <DisplaySection />
        <section className="panel row-between">
          <div>
            <h2 className="t-card">Log out</h2>
            <p className="t-help">You can log back in at any time.</p>
          </div>
          <Button variant="danger-outline" icon="logout" onClick={() => void logOut()}>
            Log out
          </Button>
        </section>
      </div>
    </main>
  );
}
