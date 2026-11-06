import { resetPasswordSchema, toFieldErrors } from '@urcst/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PasswordField } from '../components/PasswordField';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { useFocusFirstError } from '../lib/useFocusFirstError';

function ExpiredLink() {
  return (
    <div className="state error auth-sent" role="alert">
      <span className="state-ic">
        <Icon name="alert" />
      </span>
      <h1 className="state-title">This reset link has expired or was already used.</h1>
      <p>Request a new link to choose your password.</p>
      <Link className="btn btn-primary" to="/forgot-password">
        Request a new link
      </Link>
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusFirstError(formRef, errors);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const result = resetPasswordSchema.safeParse({ token, password });
    const found = result.success ? {} : toFieldErrors(result.error);

    if (!found.password && confirmPassword !== password) {
      found.confirmPassword = 'Passwords do not match.';
    }
    setErrors(found);
    if (!result.success || Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await api.resetPassword(result.data);
      toast('Password updated. You can now log in.');
      navigate('/login');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_LINK') {
        setExpired(true);
      } else {
        setFormError(error instanceof ApiError ? error.message : 'Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        {expired || !token ? (
          <ExpiredLink />
        ) : (
          <>
            <h1 className="t-page auth-title">Choose a new password</h1>
            <p className="muted auth-intro">Enter your new password below.</p>

            {formError && (
              <div className="notice err auth-notice" role="alert">
                <Icon name="alert" />
                <span>{formError}</span>
              </div>
            )}

            <form ref={formRef} className="stack auth-form" onSubmit={handleSubmit} noValidate>
              <PasswordField
                id="reset-password"
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                help="At least 8 characters."
                error={errors.password}
              />
              <PasswordField
                id="reset-confirm"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                error={errors.confirmPassword}
              />
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                Save new password
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
