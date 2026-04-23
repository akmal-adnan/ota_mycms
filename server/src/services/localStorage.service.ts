import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

function uploadsRoot(): string {
  return path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR);
}

function getLocalFilePath(key: string): string {
  const root = uploadsRoot();
  const filePath = path.resolve(root, key);

  // Prevent path traversal outside the configured uploads root.
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid local storage key path');
  }

  return filePath;
}

export async function uploadToLocal(
  key: string,
  body: Buffer,
  _contentType: string,
): Promise<string> {
  const filePath = getLocalFilePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
  return key;
}

export async function deleteFromLocal(key: string): Promise<void> {
  try {
    const filePath = getLocalFilePath(key);
    await fs.unlink(filePath);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code !== 'ENOENT') {
      logger.warn(
        { err, key },
        'Failed to delete local bundle file — may not exist',
      );
    }
  }
}

export function generateLocalUrl(key: string, baseUrl?: string): string {
  const safeKey = key.replace(/\\/g, '/');
  const relativePath = `/uploads/${safeKey}`;
  if (!baseUrl) return relativePath;
  return `${baseUrl.replace(/\/$/, '')}${relativePath}`;
}
