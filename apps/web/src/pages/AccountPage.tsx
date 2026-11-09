import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePasswordSchema,
  contactPreferencesSchema,
  toFieldErrors,
  updateProfileSchema,
  type ContactPreferences,
} from '@urcst/shared';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useLogout } from '../auth/useLogout';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';
import { PickGroup } from '../components/PickGroup';
import { useToast } from '../components/Toast';
import { useDisplay } from '../display/DisplayProvider';
import { PREF_LABELS } from '../display/prefs';
import { ApiError, api } from '../lib/api';
import { initials } from '../lib/format';
import { useFocusFirstError } from '../lib/useFocusFirstError';
import { LANGUAGE_NAMES, LANGUAGES, t, tNode } from '../i18n';

/** One settings section: an icon, a title and a sentence, then its controls. */
function SettingsCard({
  id,
  icon,
  title,
  intro,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-card" aria-labelledby={id}>
      <div className="flex items-start gap-3 border-b border-line px-6 py-4 max-phone:px-4">
        <span className="grid size-10 flex-none place-items-center rounded-md bg-blue-50 text-blue-700">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="m-0 scroll-mt-24 text-[1.125rem] font-semibold" id={id}>
            {tNode(title)}
          </h2>
          <p className="t-help m-0">{tNode(intro)}</p>
        </div>
      </div>
      <div className="px-6 py-5 max-phone:px-4">{children}</div>
    </section>
  );
}

const CONTACT_KEY = ['contact-preferences'];
const LANGUAGE_OPTIONS = LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }));
const SIZE_OPTIONS = Object.entries(PREF_LABELS.size).map(([value, label]) => ({ value, label }));

function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const isLandlord = user?.role === 'LANDLORD';
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
        label={t('Full name')}
        value={fullName}
        onChange={setFullName}
        autoComplete="name"
        required
        error={errors.fullName}
      />
      <Field
        id="ac-email"
        label={t('Email address')}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        error={errors.email}
      />
      <Field
        id="ac-phone"
        label={isLandlord ? t('Phone number (shown to students)') : t('Phone number (optional)')}
        type="tel"
        value={phone}
        onChange={setPhone}
        autoComplete="tel"
        required={isLandlord}
        error={errors.phone}
      />
      <div className="full">
        <Button type="submit" disabled={busy}>
          {t('Save changes')}
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
          label={t('Current password')}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          error={errors.currentPassword}
        />
      </div>
      <PasswordField
        id="pw-new"
        label={t('New password')}
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        help={t('At least 8 characters.')}
        error={errors.newPassword}
      />
      <PasswordField
        id="pw-new2"
        label={t('Confirm new password')}
        value={repeat}
        onChange={setRepeat}
        autoComplete="new-password"
        error={errors.repeat}
      />
      <div className="full">
        <Button type="submit" disabled={busy}>
          {t('Update password')}
        </Button>
      </div>
    </form>
  );
}

function DisplaySection() {
  const { prefs, setPref, setPanelOpen } = useDisplay();

  return (
    <SettingsCard
      id="ax-h"
      icon="text"
      title={t('Display & language')}
      intro={t('Make the platform easier to read and hear.')}
    >
      <PickGroup
        label={t('Text size')}
        value={prefs.size}
        options={SIZE_OPTIONS}
        onChange={(value) => setPref('size', value)}
      />
      <div className="row account-more">
        <Button
          variant="secondary"
          icon="palette"
          className="text-left whitespace-normal!"
          onClick={() => setPanelOpen(true)}
        >
          {t('More display & audio options')}
        </Button>
        <span className="t-help">
          {t('Font style, line spacing, contrast, highlighting and read-aloud.')}
        </span>
      </div>
      <hr className="divider" />
      <PickGroup
        label={t('Language')}
        value={prefs.lang}
        options={LANGUAGE_OPTIONS}
        onChange={(value) => setPref('lang', value)}
      />
      <p className="t-help m-0">
        {t(
          'Menus, buttons and messages change language. Listings stay as the landlord wrote them.',
        )}
      </p>
    </SettingsCard>
  );
}

const CONTACT_METHODS: { key: keyof ContactPreferences; icon: IconName; label: string }[] = [
  { key: 'allowPhone', icon: 'phone', label: 'Phone calls' },
  { key: 'allowWhatsapp', icon: 'whatsapp', label: 'WhatsApp' },
  { key: 'allowInApp', icon: 'message', label: 'In-app messages' },
];

function ContactMethods() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: prefs } = useQuery({
    queryKey: CONTACT_KEY,
    queryFn: api.contactPreferences,
  });

  async function toggle(key: keyof ContactPreferences) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    const result = contactPreferencesSchema.safeParse(next);
    if (!result.success) {
      toast(result.error.issues[0]?.message ?? 'Please try again.', { type: 'error' });
      return;
    }
    try {
      queryClient.setQueryData(CONTACT_KEY, await api.saveContactPreferences(next));
      toast('Contact preferences saved.');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Please try again.', { type: 'error' });
    }
  }

  return (
    <SettingsCard
      id="cp-h"
      icon="phone"
      title={t('How students can contact you')}
      intro={t('Only the methods you turn on are shown on your listings.')}
    >
      <div className="flex flex-col divide-y divide-line [&_.switch]:py-3">
        {CONTACT_METHODS.map(({ key, icon, label }) => (
          <label className="switch" key={key}>
            <span>
              <Icon name={icon} /> {tNode(label)}
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={prefs?.[key] ?? false}
              disabled={!prefs}
              onChange={() => void toggle(key)}
            />
          </label>
        ))}
      </div>
    </SettingsCard>
  );
}

const SECTION_LINKS: { id: string; label: string; icon: IconName; landlordOnly?: boolean }[] = [
  { id: 'pi-h', label: 'Personal information', icon: 'user' },
  { id: 'cp-h', label: 'Contact methods', icon: 'phone', landlordOnly: true },
  { id: 'pw-h', label: 'Password', icon: 'lock' },
  { id: 'ax-h', label: 'Display & language', icon: 'text' },
];

export function AccountPage() {
  const { user } = useAuth();
  const logOut = useLogout();
  const { hash } = useLocation();
  const isLandlord = user?.role === 'LANDLORD';
  const name = user?.fullName ?? 'Your account';

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div>
          <h1 className="t-page">{t('Account & preferences')}</h1>
          <p className="muted m-0">
            {t('Manage your details, password, accessibility and display.')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 desktop:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 desktop:sticky desktop:top-24">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-card p-4 desktop:flex-col desktop:p-6 desktop:text-center">
            <span className="grid size-14 flex-none place-items-center rounded-full bg-blue text-lg font-semibold text-white desktop:size-20 desktop:text-2xl">
              {initials(name)}
            </span>
            <span className="flex min-w-0 flex-col">
              <b className="truncate">{tNode(name)}</b>
              <span className="truncate text-sm text-muted">{user?.email}</span>
              <span className="mt-2 inline-flex self-start rounded-full bg-blue-50 px-3 py-0.5 text-sm font-semibold text-blue-700 desktop:self-center">
                {isLandlord ? t('Landlord') : t('Student')}
              </span>
            </span>
          </div>
          <nav
            className="hidden flex-col gap-1 rounded-lg border border-line bg-card p-2 desktop:flex"
            aria-label={t('Account sections')}
          >
            {SECTION_LINKS.filter(({ landlordOnly }) => isLandlord || !landlordOnly).map(
              ({ id, label, icon }) => (
                <a
                  key={id}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 font-medium text-ink no-underline transition-colors hover:bg-blue-50 hover:text-blue-700"
                  href={`#${id}`}
                >
                  <Icon name={icon} />
                  {tNode(label)}
                </a>
              ),
            )}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <SettingsCard
            id="pi-h"
            icon="user"
            title={t('Personal information')}
            intro={t('Your name and how to reach you.')}
          >
            <ProfileForm />
          </SettingsCard>
          {isLandlord && <ContactMethods />}
          <SettingsCard
            id="pw-h"
            icon="lock"
            title={t('Change password')}
            intro={t('Use at least 8 characters. Do not reuse a password from another site.')}
          >
            <PasswordForm />
          </SettingsCard>
          <DisplaySection />
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-border bg-card px-6 py-5 max-phone:px-4">
            <div>
              <h2 className="m-0 text-[1.125rem] font-semibold">{t('Log out')}</h2>
              <p className="t-help m-0">{t('You can log back in at any time.')}</p>
            </div>
            <Button variant="danger-outline" icon="logout" onClick={() => void logOut()}>
              {t('Log out')}
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
