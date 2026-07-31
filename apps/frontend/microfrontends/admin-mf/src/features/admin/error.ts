// Helper para extraer un mensaje legible de un error de RTK Query.
export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error.'): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { data?: unknown; error?: string; message?: string };
  if (e.data && typeof e.data === 'object') {
    const d = e.data as { message?: string | string[] };
    if (Array.isArray(d.message)) return d.message.join(' ');
    if (typeof d.message === 'string') return d.message;
  }
  if (typeof e.error === 'string') return e.error;
  if (typeof e.message === 'string') return e.message;
  return fallback;
}
