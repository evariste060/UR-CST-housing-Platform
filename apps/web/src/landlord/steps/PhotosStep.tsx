import { MAX_PHOTOS } from '@urcst/shared';
import { useState, type ChangeEvent } from 'react';
import { Badge } from '../../components/Badge';
import { Button, buttonClass } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { ApiError, api } from '../../lib/api';
import type { Draft } from '../useDraft';
import { t, tNode } from '../../i18n';

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

  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-line-strong bg-surface px-6 py-10 text-center transition-colors hover:border-blue max-phone:px-4">
        <span className="grid size-14 place-items-center rounded-full bg-blue-50 text-blue-700 [&>.ic]:size-7">
          <Icon name="upload" />
        </span>
        <b className="text-[1.0625rem]">{t('Add photos of the room, bathroom and outside')}</b>
        <p className="t-help m-0 max-w-[460px]">
          {t('JPG, PNG or WebP, up to 5 MB each, and up to')} {tNode(MAX_PHOTOS)}{' '}
          {t('photos. Clear daytime photos help students decide.')}
        </p>
        <input
          type="file"
          id="wz-files"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || full}
          onChange={(event) => void choose(event)}
        />
        <label
          className={`${buttonClass()} ${uploading || full ? 'pointer-events-none opacity-60' : ''}`}
          htmlFor="wz-files"
        >
          <Icon name="image" />
          {uploading ? t('Adding photos…') : full ? t('Photo limit reached') : t('Choose photos')}
        </label>
      </div>
      {error && (
        <p className="err-msg" role="alert">
          <Icon name="alert" />
          {tNode(error)}
        </p>
      )}
      {photos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b>
              {t('Your photos')}{' '}
              <span className="num font-normal text-muted">
                ({tNode(photos.length)} {t('of')} {tNode(MAX_PHOTOS)})
              </span>
            </b>
            <span className="t-help">{t('The cover photo appears first in search results.')}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {photos.map(({ id: photoId, url }, index) => {
              const number = index + 1;
              const isCover = photoId === coverId;
              return (
                <div
                  key={photoId}
                  className={`flex flex-col overflow-hidden rounded-lg border bg-card ${isCover ? 'border-blue shadow-[0_0_0_2px_var(--blue)]' : 'border-line'}`}
                >
                  <div className="relative aspect-[4/3] bg-surface">
                    <img
                      className="size-full object-cover"
                      src={url}
                      alt={t('Upload {number}', { number })}
                    />
                    <span className="num absolute top-2 left-2 rounded-sm bg-card px-2 py-0.5 text-sm font-semibold">
                      {tNode(number)}
                    </span>
                    {isCover && (
                      <span className="absolute top-2 right-2">
                        <Badge tone="approved" icon="star">
                          {t('Cover')}
                        </Badge>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {!isCover && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="star"
                        className="w-full"
                        aria-label={t('Set photo {number} as cover', { number })}
                        onClick={() =>
                          arrange(
                            photos.map((photo) => photo.id),
                            photoId,
                          )
                        }
                      >
                        {t('Set as cover')}
                      </Button>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="icon-btn border-line! disabled:opacity-40"
                          aria-label={t('Move photo {number} earlier', { number })}
                          title={t('Move earlier')}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <Icon name="chevL" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn border-line! disabled:opacity-40"
                          aria-label={t('Move photo {number} later', { number })}
                          title={t('Move later')}
                          disabled={index === photos.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <Icon name="chevR" />
                        </button>
                      </span>
                      <button
                        type="button"
                        className="icon-btn border-line! text-red-text! hover:border-red-border! hover:bg-red-50!"
                        aria-label={t('Remove photo {number}', { number })}
                        title={t('Remove photo')}
                        onClick={() => void remove(photoId)}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
