'use client';

import { Button, cn } from '@aletheia/frontend-commons';
import * as React from 'react';
import { CloseIcon } from './icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Self-contained Neobrutalism modal. Commons ships no Dialog primitive and
 * Radix dialog is not a dependency here, so this is intentionally local.
 * Closes on Escape and backdrop click; locks body scroll while open.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-base border-2 border-border bg-background shadow-shadow',
          'animate-hero',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-border p-5">
          <div className="space-y-1">
            <h2 className="font-heading text-xl leading-none">{title}</h2>
            {description ? (
              <p className="font-sans text-xs text-foreground/60">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar modal">
            <CloseIcon />
          </Button>
        </div>
        {children ? <div className="p-5">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t-2 border-border p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
