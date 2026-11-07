import { forgotPasswordSchema, toFieldErrors } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';
import { buttonClass } from '../components/Button';

export function ForgotPasswordPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusFirstError(formRef, errors);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.forgotPassword(result.data);
      setSentTo(result.data.email);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <main className="auth-wrap" id="main">
        <div className="auth-card">
          <div className="state success auth-sent" role="status">
            <span className="state-ic">
              <Icon name="mail" />
            </span>
            <h1 className="state-title">Check your email</h1>
            <p>
              If an account exists for <b>{sentTo}</b>, we have sent a link to reset your password.
            </p>
            {import.meta.env.DEV && (
              <div className="notice auth-dev-notice">
                <Icon name="info" />
                <span>Development: no email is sent. The link is printed in the API console.</span>
              </div>
            )}
            <Link className={buttonClass({ variant: 'secondary' })} to="/login">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-wrap" id="main">
      <div className="auth-card">
        <h1 className="t-page auth-title">Reset your password</h1>
        <p className="muted auth-intro">
          Enter the email you registered with. We will send you a reset link.
        </p>

        {formError && (
          <div className="notice err auth-notice" role="alert">
            <Icon name="alert" />
            <span>{formError}</span>
          </div>
        )}

        <form ref={formRef} className="stack auth-form" onSubmit={handleSubmit} noValidate>
          <Field
            id="forgot-email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            autoComplete="email"
            error={errors.email}
          />
          <button
            className={buttonClass({ size: 'lg', block: true })}
            type="submit"
            disabled={busy}
          >
            Send Reset Link
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">
            <Icon name="chevL" /> Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}
