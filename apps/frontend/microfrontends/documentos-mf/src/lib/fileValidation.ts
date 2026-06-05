// Shared client-side validation for document/version uploads.
import { formatBytes } from './format';

/** Maximum accepted upload size in bytes (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Accepted MIME types for documents (matches the file picker's accept). */
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const;

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

/**
 * Validates an upload candidate against size and type rules.
 * Returns a human-readable error message (Spanish) or null when valid.
 */
export function validateDocumentFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `El archivo supera el máximo de ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const mimeOk = mime !== '' && (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  // Accept when either the MIME or the extension matches (some browsers omit MIME).
  if (!mimeOk && !extOk) {
    return 'Formato no permitido. Usa PDF, PNG o JPG.';
  }

  return null;
}
