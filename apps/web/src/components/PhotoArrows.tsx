import { Icon } from './Icon';
import { t } from '../i18n';

interface PhotoArrowsProps {
  title: string;
  count: number;
  index: number;
  onChange: (index: number) => void;
  /** Where the arrows sit on the image. */
  placement: string;
}

const ARROW =
  'absolute z-[1] grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-white/95 text-[#0f172a] shadow-soft hover:bg-white';

/** Previous and next buttons on a card's image, with the photo count. Shows only for 2+ photos. */
export function PhotoArrows({ title, count, index, onChange, placement }: PhotoArrowsProps) {
  if (count < 2) return null;

  return (
    <>
      <button
        type="button"
        className={`${ARROW} left-2 ${placement}`}
        aria-label={t('Previous photo of {title}', { title })}
        onClick={() => onChange((index - 1 + count) % count)}
      >
        <Icon name="chevL" />
      </button>
      <button
        type="button"
        className={`${ARROW} right-2 ${placement}`}
        aria-label={t('Next photo of {title}', { title })}
        onClick={() => onChange((index + 1) % count)}
      >
        <Icon name="chevR" />
      </button>
      <span className="sr-only" aria-live="polite">
        {t('Photo')} {index + 1} {t('of')} {count}
      </span>
      <span
        className="photo-count absolute bottom-2 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-[#0f172a]/75 px-2.5 py-0.5 text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {index + 1} / {count}
      </span>
    </>
  );
}
