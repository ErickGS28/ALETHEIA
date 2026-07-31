// Triggers a real file download in the browser from in-memory text.

/** Downloads `content` as a file named `filename` using a Blob + anchor. */
export function downloadTextFile(content: string, filename: string, mime = 'text/csv'): void {
  if (typeof window === 'undefined') return;
  // Prepend UTF-8 BOM so Excel renders accents (á, é, ñ) correctly.
  const blob = new Blob([`﻿${content}`], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
