'use client';

// Contracts CSV export. The gateway endpoint returns plain CSV TEXT (not JSON), so we
// bypass RTK Query (which expects JSON) and fetch it directly with the Bearer token,
// then trigger a Blob download.

import { API_URL, getAccessToken } from '@aletheia/frontend-commons';
import { downloadTextFile } from '../../lib/download';

/**
 * Downloads the contracts report as a CSV file.
 * Throws on a non-OK response so callers can surface an error in the UI.
 */
export async function exportContractsCsv(): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/reports/export?format=csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }

  const csv = await res.text();
  const stamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(csv, `reporte-contratos-${stamp}.csv`);
}
