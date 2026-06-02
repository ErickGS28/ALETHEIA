// Small presentation helpers shared by the features.

/** Formats a byte count into a human-readable string. */
export function formatBytes(bytes?: number): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** Formats an ISO date string as dd/mm/yyyy. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Short label for a MIME type. */
export function formatMimeType(mime?: string): string {
  if (!mime) return '—';
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
  };
  return map[mime] ?? mime;
}

/** Derives a file name from a fileUrl (the backend stores a URL/string). */
export function fileNameFromUrl(fileUrl: string): string {
  if (!fileUrl) return 'documento';
  // Strip query/hash and take the last path segment.
  const clean = fileUrl.split(/[?#]/)[0];
  const segment = clean.split('/').pop() ?? clean;
  return decodeURIComponent(segment) || 'documento';
}
