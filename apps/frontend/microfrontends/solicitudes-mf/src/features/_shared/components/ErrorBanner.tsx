'use client';

import { AlertTriangle, X } from 'lucide-react';

// Inline error banner (neobrutalism). Used to surface backend errors
// (403/400) from fire-and-forget mutations so the user can see them.

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-base border-2 border-border bg-destructive/10 px-4 py-3 shadow-shadow"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <p className="flex-1 font-sans text-sm text-destructive">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-destructive/70 transition-colors hover:text-destructive"
          aria-label="Descartar error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
