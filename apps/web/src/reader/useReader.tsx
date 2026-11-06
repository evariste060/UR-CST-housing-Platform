import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useDisplay } from '../display/DisplayProvider';
import { chunkForTap, collectChunks, speakable, type ReadChunk } from './speakable';

const READING_CLASS = 'reading';
// Chrome drops an utterance that is queued straight after cancel().
const SPEAK_DELAY_MS = 60;

export interface ReaderState {
  active: boolean;
  paused: boolean;
  index: number;
  total: number;
  label: string;
  text: string;
}

const IDLE: ReaderState = { active: false, paused: false, index: 0, total: 0, label: '', text: '' };

interface ReaderContextValue extends ReaderState {
  supported: boolean;
  /** Reads the given blocks, or the whole page when none are given. */
  start: (label: string, chunks?: ReadChunk[]) => void;
  pause: () => void;
  resume: () => void;
  step: (direction: 1 | -1) => void;
  stop: () => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

function speechAvailable() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function clearHighlight() {
  document
    .querySelectorAll(`.${READING_CLASS}`)
    .forEach((element) => element.classList.remove(READING_CLASS));
}

export function ReaderProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { prefs } = useDisplay();
  const { pathname } = useLocation();
  const [state, setState] = useState(IDLE);

  const chunks = useRef<ReadChunk[]>([]);
  const index = useRef(0);
  // Bumped whenever speech is interrupted, so a late event from old speech does nothing.
  const token = useRef(0);
  const reading = useRef(false);
  const paused = useRef(false);
  const rate = useRef(prefs.rate);
  const label = useRef('');

  const publish = useCallback(() => {
    setState({
      active: true,
      paused: paused.current,
      index: index.current,
      total: chunks.current.length,
      label: label.current,
      text: chunks.current[index.current]?.text ?? '',
    });
  }, []);

  const finish = useCallback(() => {
    token.current += 1;
    reading.current = false;
    paused.current = false;
    if (speechAvailable()) window.speechSynthesis.cancel();
    clearHighlight();
    setState(IDLE);
  }, []);

  const speakCurrent = useCallback(
    function speak() {
      const chunk = chunks.current[index.current];
      if (!chunk) {
        finish();
        return;
      }

      clearHighlight();
      if (chunk.element?.isConnected) {
        chunk.element.classList.add(READING_CLASS);
        chunk.element.scrollIntoView?.({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }

      token.current += 1;
      const current = token.current;
      paused.current = false;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(speakable(chunk.text));
      utterance.rate = Number(rate.current);
      utterance.lang = 'en-GB';
      utterance.onend = () => {
        if (current !== token.current) return;
        if (index.current < chunks.current.length - 1) {
          index.current += 1;
          speak();
        } else {
          finish();
        }
      };
      utterance.onerror = ({ error }) => {
        if (current !== token.current || error === 'interrupted' || error === 'canceled') return;
        finish();
        toast('Read-aloud stopped: this browser could not play the voice.', { type: 'error' });
      };

      setTimeout(() => {
        if (current === token.current) window.speechSynthesis.speak(utterance);
      }, SPEAK_DELAY_MS);
      publish();
    },
    [finish, publish, toast],
  );

  const start = useCallback(
    (newLabel: string, given?: ReadChunk[]) => {
      if (!speechAvailable()) {
        toast('Read-aloud is not available in this browser. Try Chrome, Edge or Safari.', {
          type: 'error',
        });
        return;
      }
      const list = given ?? collectChunks(document.querySelector('main'));
      if (list.length === 0) {
        toast('There is nothing to read here.', { type: 'info' });
        return;
      }
      chunks.current = list;
      index.current = 0;
      label.current = newLabel;
      reading.current = true;
      speakCurrent();
    },
    [speakCurrent, toast],
  );

  const pause = useCallback(() => {
    token.current += 1;
    paused.current = true;
    window.speechSynthesis.cancel();
    publish();
  }, [publish]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const last = chunks.current.length - 1;
      index.current = Math.max(0, Math.min(last, index.current + direction));
      speakCurrent();
    },
    [speakCurrent],
  );

  const stop = useCallback(() => {
    finish();
    toast('Reading stopped.', { type: 'info' });
  }, [finish, toast]);

  // A new reading speed applies straight away, from the start of the current block.
  useEffect(() => {
    if (rate.current === prefs.rate) return;
    rate.current = prefs.rate;
    if (reading.current && !paused.current) speakCurrent();
  }, [prefs.rate, speakCurrent]);

  useEffect(() => {
    if (reading.current) finish();
  }, [pathname, finish]);

  useEffect(() => {
    document.body.classList.toggle('reading-on', state.active);
  }, [state.active]);

  useEffect(() => {
    if (prefs.clickRead !== 'on') return;
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const chunk = chunkForTap(event.target);
      if (chunk) start('What you tapped', [chunk]);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [prefs.clickRead, start]);

  useEffect(() => finish, [finish]);

  const value = useMemo(
    () => ({
      ...state,
      supported: speechAvailable(),
      start,
      pause,
      resume: speakCurrent,
      step,
      stop,
    }),
    [state, start, pause, speakCurrent, step, stop],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const value = useContext(ReaderContext);
  if (!value) throw new Error('useReader must be used inside ReaderProvider.');
  return value;
}
