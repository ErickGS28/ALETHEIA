// Extracts a human-readable message from an RTK Query error.
// The shared baseApi unwraps `.data`, but errors keep the standard
// FetchBaseQueryError / SerializedError shape, so message lives in
// `error.data.message` for backend errors.

const DEFAULT_MESSAGE = 'Ocurrió un error. Intenta de nuevo.';

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
      if (Array.isArray(message) && message.length > 0) return String(message[0]);
    }
    if (typeof data === 'string' && data.trim()) return data;

    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return fallback;
}
