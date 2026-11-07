import { MAX_PHOTOS } from '@urcst/shared';
import { useState, type ChangeEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import type { Draft } from '../useDraft';

const PLEASE_TRY_AGAIN = 'We could not change your photos. Please try again.';

interface PhotosStepProps {
  draft: Draft;
  error: string | undefined;
  onError: (message: string | undefined) => void;
}

export function PhotosStep({ draft, error, onError }: PhotosStepProps) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const { photos, coverId } = draft;
  const id = draft.getId() ?? '';

  async function run(action: () => Promise<Parameters<Draft['applyPhotos']>[0]>) {
    try {
      draft.applyPhotos(await action());
      onError(undefined);
      return true;
    } catch (failure) {
      onError(failure instanceof ApiError ? failure.message : PLEASE_TRY_AGAIN);
      return false;
    }
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    await run(() => api.addPhotos(id, files));
    setUploading(false);
  }

  function arrange(order: string[], cover: string) {
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    draft.setPhotos(order.flatMap((photoId) => byId.get(photoId) ?? []));
    draft.setCoverId(cover);
    void run(() => api.arrangePhotos(id, { order, coverId: cover }));
  }

  function move(index: number, by: number) {
    const order = photos.map((photo) => photo.id);
    const [moved] = order.splice(index, 1);
    if (!moved || !coverId) return;
    order.splice(index + by, 0, moved);
    arrange(order, coverId);
  }

  async function remove(photoId: string) {
    if (!(await run(() => api.removePhoto(id, photoId)))) return;
    toast('Photo removed.', { undo: () => void run(() => api.restorePhoto(id, photoId)) });
  }

  return (
    <div className="stack">
      <div className="drop">
        <span className="drop-ic">
          <Icon name="upload" />
        </span>
        <b>Add photos of the room, bathroom and outside</b>
        <p className="t-help">
          JPG, PNG or WebP, up to 5 MB each. Clear daytime photos help students decide.
        </p>
        <input
          type="file"
          id="wz-files"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onChange={(event) => void choose(event)}
        />
        <label className={buttonClass()} htmlFor="wz-files">
          <Icon name="image" />
          {uploading ? 'Adding photos…' : 'Choose photos'}
        </label>
      </div>
      {error && (
        <p className="err-msg" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      {photos.length > 0 && (
        <>
          <p className="t-support">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}. The cover photo appears
            first in search results.
          </p>
          <div className="photo-grid">
            {photos.map(({ id: photoId, url }, index) => {
              const number = index + 1;
              return (
                <div key={photoId} className={photoId === coverId ? 'photo cover' : 'photo'}>
                  <img src={url} alt={`Upload ${number}`} />
                  <div className="pbar">
                    {photoId === coverId ? (
                      <Badge tone="approved" icon="star">
                        Cover
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Set photo ${number} as cover`}
                        onClick={() =>
                          arrange(
                            photos.map((photo) => photo.id),
                            photoId,
                          )
                        }
                      >
                        Set as cover
                      </Button>
                    )}
                    <span className="row photo-tools">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move photo ${number} earlier`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <Icon name="chevL" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move photo ${number} later`}
                        disabled={index === photos.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <Icon name="chevR" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn photo-remove"
                        aria-label={`Remove photo ${number}`}
                        onClick={() => void remove(photoId)}
                      >
                        <Icon name="trash" />
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
