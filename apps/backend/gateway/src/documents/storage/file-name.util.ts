import { extname } from 'node:path';

/**
 * Extracts a conservative, safe extension from an original filename
 * (defense against path/extension injection in generated storage keys).
 * Returns '' when the extension doesn't match a plain alphanumeric pattern.
 */
export function safeExtension(originalName: string): string {
  const ext = extname(originalName || '').toLowerCase();
  return /^\.[a-z0-9]{1,12}$/.test(ext) ? ext : '';
}
