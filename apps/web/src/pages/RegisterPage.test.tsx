import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { json, renderRoute, sentBody, stubApi } from '../test/render';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function chooseRole(name: string) {
  renderRoute('/register');
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

async function fillStudent() {
  await userEvent.type(screen.getByLabelText(/Full name/), 'Aline Mukamana');
  await userEvent.type(screen.getByLabelText(/Email address/), 'aline@example.com');
  await userEvent.type(screen.getByLabelText(/^Password/), 'long-enough');
  await userEvent.type(screen.getByLabelText(/Confirm password/), 'long-enough');
  await userEvent.click(screen.getByRole('checkbox'));
}

describe('RegisterPage', () => {
  it('starts with the account type step and never offers administrator', async () => {
    stubApi(() => json({}));
    renderRoute('/register');

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I am a Student/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I am a Landlord/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Administrator/ })).not.toBeInTheDocument();
  });

  it('shows the prototype messages for an empty student form', async () => {
    stubApi(() => json({}));
    await chooseRole('I am a Student');

    await submit();

    expect(await screen.findByText('Please enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Please create a password.')).toBeInTheDocument();
    expect(screen.getByText('Please accept the terms to continue.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveFocus();
  });

  it('requires a phone number from landlords', async () => {
    stubApi(() => json({}));
    await chooseRole('I am a Landlord');

    expect(screen.getByText('Shown to students on your listings.')).toBeInTheDocument();
    await submit();

    expect(
      await screen.findByText('Please enter a phone number so students can reach you.'),
    ).toBeInTheDocument();
  });

  it('checks the password rules in the prototype order', async () => {
    stubApi(() => json({}));
    await chooseRole('I am a Student');

    await userEvent.type(screen.getByLabelText(/^Password/), 'short');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'different');
    await submit();

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Password/), '-now-long');
    await submit();

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('creates the account, welcomes the user and opens the search', async () => {
    const fetchMock = stubApi(() =>
      json(
        {
          user: {
            id: 'u1',
            email: 'aline@example.com',
            fullName: 'Aline Mukamana',
            phone: null,
            role: 'STUDENT',
          },
        },
        201,
      ),
    );
    await chooseRole('I am a Student');

    await fillStudent();
    await submit();

    expect(
      await screen.findByRole('heading', { name: 'Find accommodation near UR-CST' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Account created. Welcome, Aline!')).toBeInTheDocument();
    expect(sentBody(fetchMock, '/auth/register')).toMatchObject({
      role: 'STUDENT',
      email: 'aline@example.com',
    });
  });

  it('shows the server message when the email is taken', async () => {
    const message = 'An account with this email already exists. Log in or use a different email.';
    stubApi(() =>
      json({ error: { code: 'EMAIL_TAKEN', message: 'Taken', fields: { email: message } } }, 409),
    );
    await chooseRole('I am a Student');

    await fillStudent();
    await submit();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toHaveFocus();
  });

  it('shows the Terms without ticking the checkbox', async () => {
    stubApi(() => json({}));
    await chooseRole('I am a Student');

    await userEvent.click(screen.getByRole('button', { name: 'Terms' }));

    expect(screen.getByText(/not a party to any rental agreement/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('can go back to the account type step', async () => {
    stubApi(() => json({}));
    await chooseRole('I am a Landlord');

    await userEvent.click(screen.getByRole('button', { name: 'Change account type' }));

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
  });
});
