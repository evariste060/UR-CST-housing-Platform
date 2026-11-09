import type { ReactNode } from 'react';
import { useLanguage } from '.';

/**
 * Text is translated as each component renders, so the whole app renders again when the
 * language changes. The tree is built inside this render, so nothing is skipped, and nothing
 * is remounted: forms keep what people typed.
 */
export function LanguageRoot({ render }: { render: () => ReactNode }) {
  useLanguage();
  return render();
}
