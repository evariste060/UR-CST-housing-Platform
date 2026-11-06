import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProviders } from '../AppProviders';
import { ReaderBar } from '../components/ReaderBar';
import { useReader } from './useReader';

class FakeUtterance {
  rate = 1;
  lang = '';
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

const spoken: FakeUtterance[] = [];
const speech = {
  cancel: vi.fn(),
  speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
};

function Harness({ blocks = ['First block', 'Second 5 km block'] }: { blocks?: string[] }) {
  const reader = useReader();
  const chunks = () =>
    blocks.map((text, index) => ({ element: document.getElementById(`b${index}`), text }));
  return (
    <main>
      {blocks.map((text, index) => (
        <p key={text} id={`b${index}`}>
          {text}
        </p>
      ))}
      <button onClick={() => reader.start('This page', chunks())}>Read</button>
      <Link to="/other">Other page</Link>
      <ReaderBar />
    </main>
  );
}

function renderReader() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AppProviders>
          <Harness />
        </AppProviders>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Waits for the short delay before speech starts. */
const nextUtterance = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

beforeEach(() => {
  spoken.length = 0;
  speech.cancel.mockClear();
  speech.speak.mockClear();
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReader', () => {
  it('reads each block in turn and highlights the current one', async () => {
    renderReader();

    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    expect(spoken[0]?.text).toBe('First block');
    expect(spoken[0]?.lang).toBe('en-GB');
    expect(screen.getByText('First block', { selector: 'p' })).toHaveClass('reading');
    expect(screen.getByText(/part 1 of 2/)).toBeInTheDocument();

    act(() => spoken[0]?.onend?.());
    await nextUtterance();

    expect(spoken[1]?.text).toBe('Second 5 kilometres block');
    expect(screen.getByText('First block', { selector: 'p' })).not.toHaveClass('reading');
    expect(screen.getByText('Second 5 km block', { selector: 'p' })).toHaveClass('reading');
  });

  it('closes the player after the last block', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();
    act(() => spoken[0]?.onend?.());
    await nextUtterance();
    act(() => spoken[1]?.onend?.());

    expect(screen.queryByRole('region', { name: 'Read aloud player' })).not.toBeInTheDocument();
    expect(document.querySelector('.reading')).toBeNull();
  });

  it('pauses and resumes from the same block', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => spoken[0]?.onend?.());
    await nextUtterance();
    expect(spoken).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await nextUtterance();
    expect(spoken[1]?.text).toBe('First block');
  });

  it('skips to the next part and limits the buttons at each end', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();
    expect(screen.getByRole('button', { name: 'Previous part' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next part' }));
    await nextUtterance();

    expect(screen.getByText(/part 2 of 2/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next part' })).toBeDisabled();
  });

  it('confirms when stopped', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    await userEvent.click(screen.getByRole('button', { name: 'Stop reading' }));

    expect(screen.getByText('Reading stopped.')).toBeInTheDocument();
    expect(document.querySelector('.reading')).toBeNull();
  });

  it('applies a new speed from the current block', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    await userEvent.click(screen.getByRole('radio', { name: 'Fast' }));
    await nextUtterance();

    expect(spoken[1]?.text).toBe('First block');
    expect(spoken[1]?.rate).toBe(1.25);
  });

  it('stops when the page changes', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    await userEvent.click(screen.getByRole('link', { name: 'Other page' }));

    expect(screen.queryByRole('region', { name: 'Read aloud player' })).not.toBeInTheDocument();
  });

  it('explains when the voice fails', async () => {
    renderReader();
    await userEvent.click(screen.getByRole('button', { name: 'Read' }));
    await nextUtterance();

    act(() => spoken[0]?.onerror?.({ error: 'synthesis-failed' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Read-aloud stopped: this browser could not play the voice.',
    );
  });

  it('says so when the browser cannot read aloud', async () => {
    vi.unstubAllGlobals();
    renderReader();

    await userEvent.click(screen.getByRole('button', { name: 'Read' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Read-aloud is not available in this browser. Try Chrome, Edge or Safari.',
    );
  });
});
