import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { safeExtension } from './file-name.util';
import type { StorageService } from './storage.interface';

/**
 * Local disk file storage — the dev fallback when Cloudflare R2 isn't
 * configured. Uploads dir is configurable via FILE_STORAGE_DIR.
 * Default: <gateway-cwd>/storage/uploads.
 */
@Injectable()
export class DiskStorageService implements StorageService {
  readonly uploadsDir: string =
    process.env.FILE_STORAGE_DIR ?? resolve(process.cwd(), 'storage', 'uploads');

  async save(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileSize: number; mimeType: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const storedFileName = `${randomUUID()}${safeExtension(file.originalname)}`;
    await writeFile(join(this.uploadsDir, storedFileName), file.buffer);
    return {
      fileUrl: `/files/${storedFileName}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  async getStream(id: string): Promise<NodeJS.ReadableStream | null> {
    const absolutePath = this.resolvePath(id);
    if (!absolutePath) return null;
    return createReadStream(absolutePath);
  }

  async saveText(key: string, content: string): Promise<{ fileUrl: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const storedFileName = this.safeKey(key);
    await writeFile(join(this.uploadsDir, storedFileName), content, 'utf8');
    return { fileUrl: `/files/${storedFileName}` };
  }

  async readText(key: string): Promise<string | null> {
    const absolutePath = this.resolvePath(this.safeKey(key));
    if (!absolutePath) return null;
    return readFile(absolutePath, 'utf8');
  }

  async delete(id: string): Promise<void> {
    const absolutePath = this.resolvePath(id);
    if (!absolutePath) return;
    await unlink(absolutePath);
  }

  /** Resolves a stored file name to an absolute path, guarding against path traversal. */
  private resolvePath(storedFileName: string): string | null {
    const base = normalize(storedFileName).replace(/^(\.\.(\/|\\|$))+/, '');
    if (base === '' || base === '.' || base === '..') return null;
    const absolutePath = join(this.uploadsDir, base);
    if (!absolutePath.startsWith(this.uploadsDir)) return null;
    if (!existsSync(absolutePath)) return null;
    return absolutePath;
  }

  private safeKey(key: string): string {
    return key.replace(/[^a-z0-9._-]/gi, '_');
  }
}
