import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { PickGroup } from './PickGroup';
import { ToastProvider, useToast } from './Toast';

describe('Toast', () => {
  function Buttons({ onUndo }: { onUndo?: () => void }) {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast('Availability updated.', { undo: onUndo })}>Plain</button>
        <button onClick={() => toast('That did not work.', { type: 'error' })}>Failure</button>
      </>
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs Undo once and removes the message', async () => {
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <Buttons onUndo={onUndo} />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Plain' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Availability updated.')).not.toBeInTheDocument();
  });

  it('has no Undo button when there is nothing to undo', async () => {
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Plain' }));

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('announces errors straight away', async () => {
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Failure' }));

    expect(screen.getByRole('alert')).toHaveTextContent('That did not work.');
  });

  it('keeps a message with Undo up for longer', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <Buttons onUndo={onUndo} />
      </ToastProvider>,
    );
    screen.getByRole('button', { name: 'Plain' }).click();
    return vi.advanceTimersByTimeAsync(5000).then(() => {
      expect(screen.getByText('Availability updated.')).toBeInTheDocument();
    });
  });
});

describe('ConfirmDialog', () => {
  function Example({
    onConfirm,
    withNote = false,
  }: {
    onConfirm: (note: string) => void;
    withNote?: boolean;
  }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Delete</button>
        <a href="/after">After</a>
        {open && (
          <ConfirmDialog
            title="Are you sure?"
            body="This cannot be undone."
            confirm="Delete listing"
            tone="danger"
            field={
              withNote
                ? { label: 'Reason', required: 'Please give a reason for the landlord.' }
                : undefined
            }
            onCancel={() => setOpen(false)}
            onConfirm={(note) => {
              onConfirm(note);
              setOpen(false);
            }}
          />
        )}
      </>
    );
  }

  it('starts on the confirm button and returns focus when cancelled', async () => {
    render(<Example onConfirm={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Delete' });

    await userEvent.click(opener);
    expect(screen.getByRole('alertdialog', { name: 'Are you sure?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete listing' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on Esc without confirming', async () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', async () => {
    render(<Example onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog');

    for (let press = 0; press < 6; press += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('requires the note when asked to', async () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} withNote />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const note = screen.getByLabelText(/Reason/);
    expect(note).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Delete listing' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(note).toHaveAccessibleDescription('Please give a reason for the landlord.');
    expect(note).toHaveFocus();

    await userEvent.type(note, '  Wrong photos  ');
    await userEvent.click(screen.getByRole('button', { name: 'Delete listing' }));

    expect(onConfirm).toHaveBeenCalledWith('Wrong photos');
  });
});

describe('PickGroup', () => {
  function Example({ error }: { error?: string }) {
    const [value, setValue] = useState<string | undefined>('single');
    return (
      <PickGroup
        label="Room type"
        value={value}
        onChange={setValue}
        error={error}
        options={[
          { value: 'single', label: 'Single room' },
          { value: 'shared', label: 'Shared room' },
          { value: 'studio', label: 'Studio' },
        ]}
      />
    );
  }

  it('echoes the choice and marks it selected', async () => {
    render(<Example />);

    await userEvent.click(screen.getByRole('radio', { name: 'Studio' }));

    expect(screen.getByRole('radio', { name: 'Studio' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Single room' })).not.toBeChecked();
    expect(screen.getByText('Selected:')).toHaveTextContent('Selected: Studio');
  });

  it('is one Tab stop and moves with the arrow keys, wrapping at the ends', async () => {
    render(<Example />);

    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Single room' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Shared room' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Shared room' })).toBeChecked();

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Studio' })).toBeChecked();

    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it('names the group for screen readers and shows errors', () => {
    render(<Example error="Choose one option to continue." />);

    expect(screen.getByRole('radiogroup', { name: 'Room type' })).toBeInTheDocument();
    expect(screen.getByText('Choose one option to continue.')).toBeInTheDocument();
  });
});
