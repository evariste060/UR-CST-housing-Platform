import { MAX_PHOTO_BYTES, MAX_PHOTOS } from '@urcst/shared';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../lib/errors';

const photoError = (message: string) =>
  new AppError(400, 'VALIDATION_ERROR', message, { photos: message });

const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
}).array('photos', MAX_PHOTOS);

/** Reads the uploaded photos into memory, so a rejected request leaves nothing on disk. */
export const uploadPhotos: RequestHandler = (req, res, next) => {
  parse(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(
        photoError(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Each photo must be 5 MB or smaller. Choose a smaller photo.'
            : `You can add up to ${MAX_PHOTOS} photos.`,
        ),
      );
      return;
    }
    next(error as Error | undefined);
  });
};

/** The file's first bytes, because its name and stated type can say anything. */
export function photoExtension(data: Buffer): string | null {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  const isWebp =
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP';
  return isWebp ? 'webp' : null;
}

export { photoError };
