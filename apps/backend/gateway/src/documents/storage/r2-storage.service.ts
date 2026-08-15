import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { safeExtension } from './file-name.util';
import type { StorageService } from './storage.interface';

export interface R2Config {
  accessKey: string;
  secretKey: string;
  bucket: string;
  endpoint: string;
}

/**
 * Cloudflare R2 (S3-compatible) storage. Object keys stay flat (no "/") so
 * they always fit as a single /files/:id route segment. Text keys (the
 * elaborated contract-document JSON) get an "aletheia-" prefix so they don't
 * collide with other projects that may share the same bucket.
 *
 * Deliberately NOT a Nest DI provider — its constructor requires a fully
 * resolved config, so StorageModule's factory constructs it manually only
 * after confirming all 4 R2 env vars are present (see Task 3). This is what
 * lets local dev fall back to DiskStorageService without R2 credentials.
 */
export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: 'auto',
      credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    });
  }

  async save(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileSize: number; mimeType: string }> {
    const key = `aletheia-doc-${randomUUID()}${safeExtension(file.originalname)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }),
    );
    return {
      fileUrl: `/files/${key}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
    };
  }

  async getStream(id: string): Promise<NodeJS.ReadableStream | null> {
    if (!this.isOwnKey(id)) return null;
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: id }));
      return result.Body as NodeJS.ReadableStream;
    } catch (err) {
      if (err instanceof Error && err.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async saveText(key: string, content: string): Promise<{ fileUrl: string }> {
    const objectKey = `aletheia-${this.safeKey(key)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: 'application/json; charset=utf-8',
      }),
    );
    return { fileUrl: `/files/${objectKey}` };
  }

  async readText(key: string): Promise<string | null> {
    const objectKey = `aletheia-${this.safeKey(key)}`;
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return (await result.Body?.transformToString()) ?? null;
    } catch (err) {
      if (err instanceof Error && err.name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.isOwnKey(id)) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: id }));
  }

  private safeKey(key: string): string {
    return key.replace(/[^a-z0-9._-]/gi, '_');
  }

  /**
   * Confines read/delete access to keys this service could itself have
   * produced (see save()/saveText()). Without this, any raw `id` supplied by
   * a caller (e.g. GET /files/:id) would be passed straight through as an R2
   * object key, letting an authenticated user read/delete ANY object in a
   * shared bucket — including ones from other projects.
   */
  private isOwnKey(id: string): boolean {
    return /^aletheia-[a-zA-Z0-9._-]+$/.test(id);
  }
}
