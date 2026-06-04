'use client';

import { cn } from '@aletheia/frontend-commons';
import { X } from 'lucide-react';
import * as React from 'react';

// Local neobrutalism modal (controlled). Dependency-free: no radix.

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-md rounded-base border-2 border-border bg-background shadow-shadow',
          className,
        )}
      >
        <div className="flex items-start justify-between border-b-2 border-border p-4">
          <div className="space-y-1">
            <h2 className="font-heading text-xl leading-none">{title}</h2>
            {description && <p className="font-sans text-xs text-foreground/60">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-base border-2 border-border p-1 transition-colors hover:bg-secondary-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children && <div className="p-4">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t-2 border-border p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
