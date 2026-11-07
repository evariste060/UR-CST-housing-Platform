import { loginSchema, toFieldErrors, type LoginInput } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Field } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';
import { buttonClass } from '../components/Button';

const DEMO_PASSWORD = 'demo1234';

const DEMO_ACCOUNTS: { email: string; icon: IconName; name: string; description: string }[] = [
  {
    email: 'student@demo.ur',
    icon: 'user',
    name: 'Demo Student',
    description: 'Search, save, compare, contact',
  },
  {
    email: 'landlord@demo.ur',
    icon: 'building',
    name: 'Demo Landlord A',
    description: 'Publish and manage listings',
  },
  {
    email: 'admin@demo.ur',
    icon: 'shieldcheck',
    name: 'Demo Administrator',
    description: 'Review listings and reports',
  },
];

// Known passwords, so these stay out of production unless a demo build asks for them.
const SHOW_DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

export function LoginPage() {
  const { setUser } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // Keeps the page to return to when someone moves between Log in and Create an account.
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusFirstError(formRef, errors);

  async function logIn(input: LoginInput) {
    setBusy(true);
    setFormError('');
    try {
      const { user } = await api.login(input);
      toast(`Signed in as ${user.fullName}.`);
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = loginSchema.safeParse({ email, password, remember });

    setFormError('');
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    void logIn(result.data);
  }

  return (
    <main className="auth-wrap" id="main">
      <div className="auth-card">
        <h1 className="t-page auth-title">Log in</h1>
        <p className="muted auth-intro">
          Welcome back. Log in to see your saved rooms and messages.
        </p>

        {formError && (
          <div className="notice err auth-notice" role="alert">
            <Icon name="alert" />
            <span>{formError}</span>
          </div>
        )}

        <form ref={formRef} className="stack auth-form" onSubmit={handleSubmit} noValidate>
          <Field
            id="login-email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="e.g. student@demo.ur"
            autoComplete="email"
            error={errors.email}
          />
          <PasswordField
            id="login-password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            error={errors.password}
          />
          <div className="row-between">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{' '}
              Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button
            className={buttonClass({ size: 'lg', block: true })}
            type="submit"
            disabled={busy}
          >
            Log in
          </button>
        </form>

        {SHOW_DEMO_ACCOUNTS && (
          <>
            <div className="or">Use a demonstration account</div>
            <div className="demo-accounts">
              {DEMO_ACCOUNTS.map(({ email: demoEmail, icon, name, description }) => (
                <button
                  key={demoEmail}
                  type="button"
                  className="demo-acc"
                  disabled={busy}
                  onClick={() => void logIn({ email: demoEmail, password: DEMO_PASSWORD })}
                >
                  <span className="avatar sm">
                    <Icon name={icon} />
                  </span>
                  <span className="grow">
                    <b>{name}</b>
                    <span className="t-support choice-text">{description}</span>
                  </span>
                  <Icon name="chevR" />
                </button>
              ))}
            </div>
            <p className="t-help auth-demo-help">
              Or type a demo email (student@demo.ur, landlord@demo.ur, admin@demo.ur) with password{' '}
              <b>{DEMO_PASSWORD}</b> to test validation.
            </p>
          </>
        )}

        <p className="auth-footer">
          New here?{' '}
          <Link to="/register" state={state}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
