import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser, Role } from '@urcst/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crumbsFor, searchQuickFind, usesWorkspaceLayout } from '../lib/routes';
import { json, renderRoute, stubApi } from '../test/render';

const person = (role: Role): AuthUser => ({
  id: 'u1',
  email: 'person@demo.ur',
  fullName: 'Demo Person',
  phone: null,
  role,
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = '';
});

describe('routes', () => {
  it('gives every level of a deep page', () => {
    expect(crumbsFor('/forgot-password').map(({ label }) => label)).toEqual([
      'Home',
      'Log in',
      'Forgot password',
    ]);
  });

  it('roots shared pages in the workspace of the person viewing them', () => {
    expect(crumbsFor('/help', 'LANDLORD')[0]?.label).toBe('Landlord workspace');
    expect(crumbsFor('/help', 'ADMIN')[0]?.label).toBe('Admin workspace');
    expect(crumbsFor('/help')[0]?.label).toBe('Home');
  });

  it('never offers workspace layouts to the wrong role', () => {
    expect(usesWorkspaceLayout('/landlord', 'LANDLORD')).toBe(true);
    expect(usesWorkspaceLayout('/admin', 'LANDLORD')).toBe(false);
    expect(usesWorkspaceLayout('/help', 'STUDENT')).toBe(false);
    expect(usesWorkspaceLayout('/search', 'ADMIN')).toBe(false);
  });

  it('only finds pages meant for that person', () => {
    const labels = (query: string, role?: Role) =>
      searchQuickFind(query, role).map(({ label }) => label);

    expect(labels('listing', 'ADMIN')).not.toContain('Add accommodation');
    expect(labels('new listing', 'LANDLORD')).toContain('Add accommodation');
    expect(labels('review')).toEqual([]);
    expect(labels('sign in')).toContain('Log in');
  });
});

describe('public header', () => {
  it('shows guests the login buttons and the current page', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    expect(await screen.findByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'You are here' });
    expect(within(trail).getByText('Design system')).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the active page in the navigation', async () => {
    stubApi(() => json({}));
    renderRoute('/saved');

    const main = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Saved Properties' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('gives students their own links', async () => {
    stubApi(() => json({}), person('STUDENT'));
    renderRoute('/student');

    const main = await screen.findByRole('navigation', { name: 'Main' });
    expect(await within(main).findByRole('link', { name: 'My Dashboard' })).toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: 'How It Works' })).not.toBeInTheDocument();
  });

  it('closes a menu on Esc and returns to its button', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    const button = await screen.findByRole('button', { name: /Language/ });

    await userEvent.click(button);
    expect(screen.getByRole('button', { name: /Kinyarwanda/ })).toBeDisabled();
    expect(screen.getByText(/planned for a later version/)).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText(/planned for a later version/)).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('applies text settings from the Text menu', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    await userEvent.click(await screen.findByRole('button', { name: /Text$/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Large' }));

    expect(document.documentElement).toHaveClass('large-text');
    expect(screen.getByText('Text size: Large.')).toBeInTheDocument();
  });

  it('switches to dark mode from the header', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    await userEvent.click(await screen.findByRole('button', { name: 'Dark Mode' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByText('Dark mode is on.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light Mode' })).toBeInTheDocument();
  });

  it('offers landlords a way to list a property that starts on the landlord form', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    await userEvent.click(await screen.findByRole('button', { name: /For Landlords/ }));
    await userEvent.click(screen.getByRole('button', { name: /List your property/ }));

    expect(await screen.findByLabelText(/Phone/)).toBeInTheDocument();
    expect(
      screen.getByText('Create a free landlord account to list your property.'),
    ).toBeInTheDocument();
  });
});

describe('workspace layout', () => {
  it('shows landlords the sidebar, trail and Add accommodation', async () => {
    stubApi(() => json({}), person('LANDLORD'));
    renderRoute('/landlord/properties/new');

    const side = await screen.findByRole('navigation', { name: 'Landlord navigation' });
    expect(within(side).getByRole('link', { name: 'My properties' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to My properties/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Add accommodation' }),
    ).toBeInTheDocument();
  });

  it('marks only the current sidebar item', async () => {
    stubApi(() => json({}), person('ADMIN'));
    renderRoute('/admin/users');

    const side = await screen.findByRole('navigation', { name: 'Administrator navigation' });
    expect(within(side).getByRole('link', { name: 'Users' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(side).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('has Listen and Display in the dock', async () => {
    stubApi(() => json({}), person('ADMIN'));
    renderRoute('/admin');

    const dock = await screen.findByRole('complementary', {
      name: 'Listen and display options',
    });
    await userEvent.click(within(dock).getByRole('button', { name: 'Display' }));

    expect(screen.getByRole('dialog', { name: 'Display & audio' })).toBeInTheDocument();
  });
});

describe('Quick find', () => {
  it('opens with Ctrl+K, filters and goes to the page', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    await userEvent.keyboard('{Control>}k{/Control}');
    const input = screen.getByLabelText('Search pages and accommodation');
    expect(input).toHaveFocus();
    expect(screen.getByText('You are on:')).toHaveTextContent('Design system');

    await userEvent.type(input, 'favourites{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Saved properties' }));
    expect(screen.queryByRole('dialog', { name: 'Quick find' })).not.toBeInTheDocument();
  });

  it('moves through results with the arrow keys and closes on Esc', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    await userEvent.keyboard('{Control>}k{/Control}{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Home' })).toHaveFocus();

    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByLabelText('Search pages and accommodation')).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Quick find' })).not.toBeInTheDocument();
  });

  it('explains when nothing matches', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    await userEvent.keyboard('{Control>}k{/Control}zzz');

    expect(screen.getByText(/Nothing found for "zzz"/)).toBeInTheDocument();
  });
});

describe('page changes', () => {
  it('moves focus to the new title, announces it and updates the tab name', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    await userEvent.click(screen.getByRole('link', { name: 'Saved Properties' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Saved properties' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.getElementById('announcer')).toHaveTextContent('Now on: Saved properties');
    expect(document.title).toBe('Saved properties · UR-CST Student Housing');
  });

  it('leaves focus alone on the first page load', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    expect(document.body).toHaveFocus();
  });
});

describe('Display panel', () => {
  async function openPanel() {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await userEvent.click(await screen.findByRole('button', { name: 'Display settings' }));
    return screen.getByRole('dialog', { name: 'Display & audio' });
  }

  it('starts on Close and returns focus on Esc', async () => {
    await openPanel();
    expect(screen.getByRole('button', { name: 'Close display settings' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Display & audio' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Display settings' })).toHaveFocus();
  });

  it('saves every display preference to this device', async () => {
    const panel = await openPanel();
    const pick = (group: string, option: RegExp) =>
      userEvent.click(
        within(within(panel).getByRole('radiogroup', { name: group })).getByRole('radio', {
          name: option,
        }),
      );

    await pick('Font style', /Lexend/);
    await pick('Light or dark', /^Dark/);
    await pick('Text size', /Extra large/);
    await pick('Line spacing', /Relaxed/);
    await pick('Contrast', /High contrast/);
    await pick('Highlight where I am', /On/);

    expect(document.documentElement.dataset.font).toBe('lexend');
    expect(document.documentElement).toHaveClass('dark', 'xl-text', 'relaxed', 'hc', 'hl');
    expect(JSON.parse(localStorage.getItem('urcst-prefs') ?? '{}')).toMatchObject({
      font: 'lexend',
      theme: 'dark',
      size: 'xl',
      spacing: 'relaxed',
      contrast: 'high',
      highlight: 'on',
    });
  });

  it('resets to the defaults', async () => {
    const panel = await openPanel();
    await userEvent.click(within(panel).getByRole('radio', { name: /High contrast/ }));

    await userEvent.click(within(panel).getByRole('button', { name: 'Reset to default' }));

    expect(document.documentElement).not.toHaveClass('hc');
    expect(localStorage.getItem('urcst-prefs')).toBeNull();
    expect(screen.getByText('Display settings reset to default.')).toBeInTheDocument();
  });
});

describe('Design system page', () => {
  it('keeps availability and admin approval as separate badges with honest wording', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');
    await screen.findByRole('heading', { level: 1, name: 'Design system' });

    expect(screen.getAllByText('Approved by admin').length).toBeGreaterThan(0);
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
  });

  it('tells people that saving does not reserve a room', async () => {
    stubApi(() => json({}));
    renderRoute('/design-system');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Save Bright single room near campus' }),
    );

    expect(
      screen.getByText('Saved to your list. This does not reserve the room.'),
    ).toBeInTheDocument();
  });
});

describe('pages still to build', () => {
  it('says so plainly', async () => {
    stubApi(() => json({}));
    renderRoute('/search');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Find Housing' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This page is being built')).toBeInTheDocument();
  });
});
