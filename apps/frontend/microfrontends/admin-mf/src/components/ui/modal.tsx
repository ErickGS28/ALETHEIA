'use client';

import { Button, cn } from '@aletheia/frontend-commons';
import { X } from 'lucide-react';
import * as React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Modal Neobrutalism controlado. Local a admin-mf.
 * Cierra con Escape, click en backdrop y botón X. Bloquea el scroll del body.
 */
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full max-w-lg rounded-base border-2 border-border bg-background shadow-shadow',
          'animate-in fade-in-0 zoom-in-95 duration-150',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-border p-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-heading leading-none tracking-tight">{title}</h2>
            {description ? (
              <p className="text-sm font-sans text-foreground/60">{description}</p>
            ) : null}
          </div>
          <Button variant="neutral" size="icon" onClick={onClose} aria-label="Cerrar">
            <X />
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t-2 border-border p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
