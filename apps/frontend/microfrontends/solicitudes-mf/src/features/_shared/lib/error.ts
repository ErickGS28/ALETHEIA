// Extracts a human-readable message from an RTK Query error.
// The gateway returns errors as `{ status, data: { message } }`; `message`
// may be a string or an array of strings (Nest validation pipe).

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error.'): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message.length > 0) return message.join(', ');
    }
  }
  return fallback;
}
