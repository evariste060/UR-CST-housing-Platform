import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@urcst/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { json, renderRoute, sentBody, stubApi } from '../test/render';

const demoStudent: AuthUser = {
  id: 'u0',
  email: 'student@demo.ur',
  fullName: 'Demo Student',
  phone: null,
  role: 'STUDENT',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openLogin() {
  renderRoute('/login');
  return screen.findByRole('heading', { name: 'Log in' });
}

describe('LoginPage', () => {
  it('shows the prototype messages for an empty form and focuses the first field', async () => {
    const fetchMock = stubApi(() => json({}));
    await openLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Please enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only /auth/me
  });

  it('links each error to its field', async () => {
    stubApi(() => json({}));
    await openLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    const email = await screen.findByLabelText('Email address');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Please enter your email address.');
  });

  it('shows the error for a wrong password', async () => {
    stubApi(() =>
      json(
        { error: { code: 'INVALID_LOGIN', message: 'The email or password is not correct.' } },
        401,
      ),
    );
    await openLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'student@demo.ur');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is not correct.',
    );
  });

  it('tells a suspended user why they cannot log in', async () => {
    const message =
      'Your account has been suspended, so you cannot log in. Contact the platform team for help.';
    stubApi(() => json({ error: { code: 'ACCOUNT_SUSPENDED', message } }, 403));
    await openLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'landlord.d@demo.ur');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('explains when the server cannot be reached', async () => {
    stubApi(() => Promise.reject(new TypeError('Failed to fetch')));
    await openLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'student@demo.ur');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server. Check your connection and try again.',
    );
  });

  it('sends Remember me and lands on the role home', async () => {
    const fetchMock = stubApi(() => json({ user: demoStudent }));
    await openLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'Student@demo.ur');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByLabelText('Remember me'));
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: /Welcome back/ })).toBeInTheDocument();
    expect(sentBody(fetchMock, '/auth/login')).toEqual({
      email: 'student@demo.ur',
      password: 'demo1234',
      remember: true,
    });
    expect(screen.getByText('Signed in as Demo Student.')).toBeInTheDocument();
  });

  it('shows and hides the password', async () => {
    stubApi(() => json({}));
    await openLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('sends someone already logged in to their home page', async () => {
    stubApi(() => json({}), demoStudent);
    renderRoute('/login');

    expect(await screen.findByRole('heading', { name: /Welcome back/ })).toBeInTheDocument();
  });
});

describe('when the session check fails', () => {
  it('shows the form once and does not keep asking the server', async () => {
    const fetchMock = vi.fn(async () => json({ error: { message: 'Down' } }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await openLogin();
    await userEvent.type(screen.getByLabelText('Email address'), 'student@demo.ur');
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(screen.getByLabelText('Email address')).toHaveValue('student@demo.ur');
  });
});

describe('role protection', () => {
  it('asks a guest to sign in with the right role', async () => {
    stubApi(() => json({}));
    renderRoute('/admin');

    expect(
      await screen.findByRole('heading', { name: 'Sign in as an administrator to open this page' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This area is only for administrator accounts.')).toBeInTheDocument();
  });

  it('blocks the wrong role', async () => {
    stubApi(() => json({}), demoStudent);
    renderRoute('/landlord');

    expect(
      await screen.findByRole('heading', { name: 'Sign in as a landlord to open this page' }),
    ).toBeInTheDocument();
  });
});
