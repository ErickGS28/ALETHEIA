/** DI token for the active StorageService implementation (Disk or R2). */
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/**
 * Storage abstraction for document binaries and small text blobs (the
 * elaborated contract document JSON). Two implementations exist —
 * DiskStorageService (local dev fallback) and R2StorageService (production,
 * Cloudflare R2) — selected by StorageModule's factory provider.
 */
export interface StorageService {
  /** Persists an uploaded file and returns metadata, including a servable "/files/<id>" URL. */
  save(file: Express.Multer.File): Promise<{ fileUrl: string; fileSize: number; mimeType: string }>;

  /** Opens a read stream for a stored file by its id (the segment after "/files/"). Null if missing. */
  getStream(id: string): Promise<NodeJS.ReadableStream | null>;

  /** Persists a UTF-8 text payload under a deterministic key, overwriting any previous content. */
  saveText(key: string, content: string): Promise<{ fileUrl: string }>;

  /** Reads back a text payload saved with saveText. Null if never saved. */
  readText(key: string): Promise<string | null>;

  /** Deletes a stored file/text blob by its id/key. No-op if it doesn't exist. */
  delete(id: string): Promise<void>;
}
