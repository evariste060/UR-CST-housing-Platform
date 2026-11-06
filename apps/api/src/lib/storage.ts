import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const LISTINGS_PATH = '/uploads/listings/';

/** Where listing photos live. Cloudinary or S3 can replace this without touching the routes. */
export interface Storage {
  /** Keeps the file and returns the address to show it at. */
  save(data: Buffer, extension: string): Promise<string>;
  /** Files that were never uploaded here, such as the demo photos, are left alone. */
  remove(url: string): Promise<void>;
}

export function localStorage(uploadsDir: string): Storage {
  const dir = join(uploadsDir, 'listings');

  return {
    async save(data, extension) {
      await mkdir(dir, { recursive: true });
      const name = `${randomUUID()}.${extension}`;
      await writeFile(join(dir, name), data);
      return `${LISTINGS_PATH}${name}`;
    },

    async remove(url) {
      if (!url.startsWith(LISTINGS_PATH)) return;
      await unlink(join(dir, basename(url))).catch(() => undefined);
    },
  };
}
