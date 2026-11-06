import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { AuthUser } from '@urcst/shared';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { App } from '../App';
import { ToastProvider } from '../components/Toast';

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Handler = (path: string, init?: RequestInit) => Response | Promise<Response>;

/** Stubs the API. `/auth/me` answers with `user` unless `handler` is given a reply for it. */
export function stubApi(handler: Handler, user: AuthUser | null = null) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace('/api', '');
    if (path === '/auth/me') return json({ user });
    return handler(path, init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderRoute(route: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function sentBody(fetchMock: ReturnType<typeof stubApi>, path: string): unknown {
  const call = fetchMock.mock.calls.find(([input]) => String(input) === `/api${path}`);
  return JSON.parse(call?.[1]?.body as string);
}
