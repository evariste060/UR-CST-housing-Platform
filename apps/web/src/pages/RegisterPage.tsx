import { registerSchema, toFieldErrors } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ChoiceCards } from '../components/ChoiceCards';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { InfoDialog, type InfoTopic } from '../components/Modal';
import { PasswordField } from '../components/PasswordField';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';

type AccountType = 'STUDENT' | 'LANDLORD';

function RegisterForm({ role, onChangeRole }: { role: AccountType; onChangeRole: () => void }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [info, setInfo] = useState<InfoTopic | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const isLandlord = role === 'LANDLORD';

  useFocusFirstError(formRef, errors);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const result = registerSchema.safeParse({ role, fullName, email, phone, password });
    const found = result.success ? {} : toFieldErrors(result.error);

    if (!found.password && confirmPassword !== password) {
      found.confirmPassword = 'Passwords do not match.';
    }
    if (!terms) found.terms = 'Please accept the terms to continue.';

    setErrors(found);
    if (!result.success || Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const { user } = await api.register(result.data);
      toast(`Account created. Welcome, ${user.fullName.split(' ')[0]}!`);
      // GuestOnly sends the user to their home page once this is set.
      setUser(user);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="link-btn" onClick={onChangeRole}>
        <Icon name="chevL" /> Change account type
      </button>
      <h1 className="t-page auth-title register-title">
        {isLandlord ? 'Landlord' : 'Student'} account
      </h1>
      <p className="muted auth-intro">
        {isLandlord
          ? 'Students will contact you using the phone number you add here.'
          : 'Use your student email if you have one.'}
      </p>

      {formError && (
        <div className="notice err auth-notice" role="alert">
          <Icon name="alert" />
          <span>{formError}</span>
        </div>
      )}

      <form ref={formRef} className="stack auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="full">
            <Field
              id="register-name"
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="e.g. Aline Mukamana"
              autoComplete="name"
              required
              error={errors.fullName}
            />
          </div>
          <Field
            id="register-email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            autoComplete="email"
            required
            error={errors.email}
          />
          <Field
            id="register-phone"
            label={isLandlord ? 'Phone number' : 'Phone number (optional)'}
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="e.g. 0788 000 000"
            autoComplete="tel"
            required={isLandlord}
            help={isLandlord ? 'Shown to students on your listings.' : undefined}
            error={errors.phone}
          />
          <PasswordField
            id="register-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            help="At least 8 characters."
            required
            error={errors.password}
          />
          <PasswordField
            id="register-confirm"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />
          <div className={`full field${errors.terms ? ' has-error' : ''}`}>
            <label className="check">
              <input
                type="checkbox"
                checked={terms}
                aria-invalid={errors.terms ? true : undefined}
                aria-describedby={errors.terms ? 'register-terms-err' : undefined}
                onChange={(event) => setTerms(event.target.checked)}
              />
              <span>
                I agree to the{' '}
                <button type="button" className="link-btn" onClick={() => setInfo('terms')}>
                  Terms
                </button>{' '}
                and{' '}
                <button type="button" className="link-btn" onClick={() => setInfo('privacy')}>
                  Privacy
                </button>
              </span>
            </label>
            {errors.terms && (
              <p className="err-msg" id="register-terms-err">
                <Icon name="alert" />
                {errors.terms}
              </p>
            )}
            {info && <InfoDialog topic={info} onClose={() => setInfo(null)} />}
          </div>
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          Create Account
        </button>
      </form>
    </>
  );
}

export function RegisterPage() {
  // The For Landlords menu opens this page with the landlord form already chosen.
  const { state } = useLocation() as { state: { role?: AccountType } | null };
  const [role, setRole] = useState<AccountType | null>(state?.role ?? null);

  return (
    <main className="auth-wrap" id="main">
      <div className="auth-card wide">
        {role ? (
          <RegisterForm role={role} onChangeRole={() => setRole(null)} />
        ) : (
          <>
            <h1 className="t-page auth-title">Create an account</h1>
            <p className="muted auth-intro">How would you like to use the platform?</p>
            <div className="auth-form">
              <ChoiceCards
                onChoose={setRole}
                options={[
                  {
                    value: 'STUDENT',
                    icon: 'user',
                    title: 'I am a Student',
                    description: 'Find, save and compare rooms near UR-CST.',
                  },
                  {
                    value: 'LANDLORD',
                    icon: 'building',
                    title: 'I am a Landlord',
                    description: 'List rooms and answer student questions.',
                  },
                ]}
              />
            </div>
            <p className="t-help auth-role-help">
              Administrator accounts are created by the platform team and cannot be registered here.
            </p>
          </>
        )}
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
