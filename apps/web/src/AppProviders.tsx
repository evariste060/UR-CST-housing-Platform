import type { ReactNode } from 'react';
import { ToastProvider } from './components/Toast';
import { DisplayProvider } from './display/DisplayProvider';
import { ReaderProvider } from './reader/useReader';
import { CompareProvider } from './student/CompareProvider';
import { SavedProvider } from './student/SavedProvider';

/** Everything the app needs inside the router. The reader stops when the page changes. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DisplayProvider>
        <ReaderProvider>
          <SavedProvider>
            <CompareProvider>{children}</CompareProvider>
          </SavedProvider>
        </ReaderProvider>
      </DisplayProvider>
    </ToastProvider>
  );
}
