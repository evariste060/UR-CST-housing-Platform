import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { json, renderRoute, sentBody, stubApi } from '../test/render';

afterEach(() => {
  vi.unstubAllGlobals();
});

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save new password' }));

describe('ForgotPasswordPage', () => {
  it('validates the email', async () => {
    stubApi(() => json({}));
    renderRoute('/forgot-password');

    await userEvent.click(await screen.findByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByText('Please enter your email address.')).toBeInTheDocument();
  });

  it('confirms without saying whether the account exists', async () => {
    stubApi(() => json({ message: 'ok' }));
    renderRoute('/forgot-password');

    await userEvent.type(await screen.findByLabelText('Email address'), 'student@demo.ur');
    await userEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'If an account exists for student@demo.ur, we have sent a link to reset your password.',
    );
  });

  it('explains when too many links were requested', async () => {
    const message = 'Too many attempts. Please wait a few minutes and try again.';
    stubApi(() => json({ error: { code: 'TOO_MANY_ATTEMPTS', message } }, 429));
    renderRoute('/forgot-password');

    await userEvent.type(await screen.findByLabelText('Email address'), 'student@demo.ur');
    await userEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});

describe('ResetPasswordPage', () => {
  it('shows the prototype messages', async () => {
    stubApi(() => json({}));
    renderRoute('/reset-password?token=abc');

    await save();

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('New password'), 'long-enough');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different');
    await save();

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('saves the password and returns to login', async () => {
    const fetchMock = stubApi(() => json({ ok: true }));
    renderRoute('/reset-password?token=abc');

    await userEvent.type(screen.getByLabelText('New password'), 'long-enough');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'long-enough');
    await save();

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText('Password updated. You can now log in.')).toBeInTheDocument();
    expect(sentBody(fetchMock, '/auth/reset-password')).toEqual({
      token: 'abc',
      password: 'long-enough',
    });
  });

  it('offers a new link when this one has expired', async () => {
    stubApi(() => json({ error: { code: 'INVALID_RESET_LINK', message: 'Expired' } }, 400));
    renderRoute('/reset-password?token=old');

    await userEvent.type(screen.getByLabelText('New password'), 'long-enough');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'long-enough');
    await save();

    expect(
      await screen.findByRole('heading', {
        name: 'This reset link has expired or was already used.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('treats a missing token as an expired link', () => {
    stubApi(() => json({}));
    renderRoute('/reset-password');

    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });
});
