import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthPage } from './HealthPage';

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HealthPage />
    </QueryClientProvider>,
  );
}

const okResponse = () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthPage', () => {
  it('shows the loading state while checking', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Checking the API…');
  });

  it('shows API OK when the API answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()));
    renderPage();

    expect(await screen.findByText('API OK')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('explains the problem when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderPage();

    expect(await screen.findByText('Unable to reach the API.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows the error state for a response that is not valid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'down' }), { status: 200 })),
    );
    renderPage();

    expect(await screen.findByText('Unable to reach the API.')).toBeInTheDocument();
  });

  it('recovers when Try again succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('API OK')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
