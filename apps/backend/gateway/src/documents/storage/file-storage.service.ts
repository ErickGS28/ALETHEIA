import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';

/**
 * Local disk file storage for document binaries.
 *
 * Uploads dir is configurable via the FILE_STORAGE_DIR env var.
 * Default: <gateway-cwd>/storage/uploads (e.g. apps/backend/gateway/storage/uploads).
 * Files are saved with a unique, safe name "<uuid><ext>"; the public URL scheme
 * served by the gateway is "/files/<storedFileName>".
 */
@Injectable()
export class FileStorageService {
  /** Absolute path to the uploads directory. */
  readonly uploadsDir: string =
    process.env.FILE_STORAGE_DIR ?? resolve(process.cwd(), 'storage', 'uploads');

  /** Persists a buffer to disk with a unique name and returns its metadata. */
  async save(file: Express.Multer.File): Promise<{
    storedFileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> {
    await mkdir(this.uploadsDir, { recursive: true });

    // Unique, safe name: keep only the original extension (sanitized).
    const ext = this.safeExtension(file.originalname);
    const storedFileName = `${randomUUID()}${ext}`;
    const absolutePath = join(this.uploadsDir, storedFileName);

    await writeFile(absolutePath, file.buffer);

    return {
      storedFileName,
      fileUrl: `/files/${storedFileName}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  /**
   * Resolves a stored file name to an absolute path, guarding against path
   * traversal. Returns null when the file does not exist or escapes the dir.
   */
  resolvePath(storedFileName: string): string | null {
    const base = normalize(storedFileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = join(this.uploadsDir, base);
    if (!absolutePath.startsWith(this.uploadsDir)) return null;
    if (!existsSync(absolutePath)) return null;
    return absolutePath;
  }

  /** Read stream for serving a stored file. */
  createReadStream(absolutePath: string) {
    return createReadStream(absolutePath);
  }

  /**
   * Persists a UTF-8 text payload under a deterministic, sanitized name (so it
   * can be read back without a database). Used for structured documents such as
   * the elaborated contract document (JSON). Overwrites any previous content.
   */
  async saveText(
    key: string,
    content: string,
  ): Promise<{ storedFileName: string; fileUrl: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const storedFileName = this.safeKey(key);
    const absolutePath = join(this.uploadsDir, storedFileName);
    await writeFile(absolutePath, content, 'utf8');
    return { storedFileName, fileUrl: `/files/${storedFileName}` };
  }

  /** Reads back a UTF-8 text payload saved with saveText. Returns null when absent. */
  async readText(key: string): Promise<string | null> {
    const absolutePath = this.resolvePath(this.safeKey(key));
    if (!absolutePath) return null;
    return readFile(absolutePath, 'utf8');
  }

  /** Builds a safe, deterministic file name from a caller-provided key. */
  private safeKey(key: string): string {
    return key.replace(/[^a-z0-9._-]/gi, '_');
  }

  private safeExtension(originalName: string): string {
    const ext = extname(originalName || '').toLowerCase();
    // Allow only a conservative extension charset.
    return /^\.[a-z0-9]{1,12}$/.test(ext) ? ext : '';
  }
}
