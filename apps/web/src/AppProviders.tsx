import type { ReactNode } from 'react';
import { ToastProvider } from './components/Toast';
import { DisplayProvider } from './display/DisplayProvider';
import { ReaderProvider } from './reader/useReader';

/** Everything the app needs inside the router. The reader stops when the page changes. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DisplayProvider>
        <ReaderProvider>{children}</ReaderProvider>
      </DisplayProvider>
    </ToastProvider>
  );
}
