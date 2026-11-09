import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setLanguage } from '../i18n';

// The first render of a test file can pass one second when many files run at once.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no layout, so it does not implement scrolling.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
  // Each test starts in English, whatever the one before chose.
  setLanguage('en');
});
