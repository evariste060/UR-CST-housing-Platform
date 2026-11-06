import { useEffect, type RefObject } from 'react';

/** After a failed submit, moves keyboard focus to the first field with an error. */
export function useFocusFirstError(
  formRef: RefObject<HTMLFormElement | null>,
  errors: Record<string, string>,
) {
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [formRef, errors]);
}
