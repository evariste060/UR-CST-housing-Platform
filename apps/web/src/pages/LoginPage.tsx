import { loginSchema, toFieldErrors, type LoginInput } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';
import { buttonClass } from '../components/Button';
import { t, tNode } from '../i18n';

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
      toast(t('Signed in as {fullName}.', { fullName: user.fullName }));
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
        <h1 className="t-page auth-title">{t('Log in')}</h1>
        <p className="muted auth-intro">
          {t('Welcome back. Log in to see your saved rooms and messages.')}
        </p>

        {formError && (
          <div className="notice err auth-notice" role="alert">
            <Icon name="alert" />
            <span>{tNode(formError)}</span>
          </div>
        )}

        <form ref={formRef} className="stack auth-form" onSubmit={handleSubmit} noValidate>
          <Field
            id="login-email"
            label={t('Email address')}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t('e.g. name@example.com')}
            autoComplete="email"
            error={errors.email}
          />
          <PasswordField
            id="login-password"
            label={t('Password')}
            value={password}
            onChange={setPassword}
            placeholder={t('Your password')}
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
              {t('Remember me')}
            </label>
            <Link to="/forgot-password">{t('Forgot password?')}</Link>
          </div>
          <button
            className={buttonClass({ size: 'lg', block: true })}
            type="submit"
            disabled={busy}
          >
            {t('Log in')}
          </button>
        </form>

        <p className="auth-footer">
          {t('New here?')}{' '}
          <Link to="/register" state={state}>
            {t('Create an account')}
          </Link>
        </p>
      </div>
    </main>
  );
}
