import type { PropertyPhotoDto } from '@urcst/shared';
import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Icon } from './Icon';

interface LightboxProps {
  photos: PropertyPhotoDto[];
  title: string;
  index: number;
  onMove: (step: number) => void;
  onClose: () => void;
}

function Lightbox({ photos, title, index, onMove, onClose }: LightboxProps) {
  const dialog = useRef<HTMLDivElement>(null);
  useFocusTrap(dialog, { onEscape: onClose });

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') onMove(-1);
    if (event.key === 'ArrowRight') onMove(1);
  }

  const photo = photos[index];

  return (
    // The backdrop is a mouse shortcut. Keyboard users have Esc and the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="overlay" onClick={closeOnBackdrop}>
      {/* The arrow keys change the photo, so the dialog listens for them. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={dialog}
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={`Photo ${index + 1} of ${photos.length}`}
        onKeyDown={onKeyDown}
      >
        <img src={photo?.url} alt={`${title}, view ${index + 1} of ${photos.length}`} />
        <div className="bar">
          <span className="num">
            {index + 1} / {photos.length}
          </span>
          <span className="row">
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous photo"
              onClick={() => onMove(-1)}
            >
              <Icon name="chevL" />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Next photo"
              onClick={() => onMove(1)}
            >
              <Icon name="chevR" />
            </button>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="x" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

export function Gallery({ photos, title }: { photos: PropertyPhotoDto[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const count = photos.length;
  const photo = photos[index];

  const move = (step: number) => setIndex((current) => (current + step + count) % count);

  if (!photo) {
    return (
      <div className="gallery-main gallery-empty">
        <Icon name="image" />
        <p className="muted">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="gallery-main">
        <img src={photo.url} alt={`${title}, view ${index + 1} of ${count}`} />
        {count > 1 && (
          <>
            <button
              type="button"
              className="nav-btn prev"
              aria-label="Previous photo"
              onClick={() => move(-1)}
            >
              <Icon name="chevL" />
            </button>
            <button
              type="button"
              className="nav-btn next"
              aria-label="Next photo"
              onClick={() => move(1)}
            >
              <Icon name="chevR" />
            </button>
          </>
        )}
        <span className="counter num">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm fs"
          onClick={() => setFullScreen(true)}
        >
          <Icon name="expand" />
          Full screen
        </button>
      </div>
      <div className="thumbs" role="group" aria-label="Choose photo">
        {photos.map(({ id, url }, position) => (
          <button
            key={id}
            type="button"
            aria-current={position === index}
            aria-label={`Show photo ${position + 1}`}
            onClick={() => setIndex(position)}
          >
            <img src={url} alt="" />
          </button>
        ))}
      </div>
      {fullScreen && (
        <Lightbox
          photos={photos}
          title={title}
          index={index}
          onMove={move}
          onClose={() => setFullScreen(false)}
        />
      )}
    </>
  );
}
