'use client';

import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';
import { Button } from './button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Permite cerrar al hacer clic en el fondo (default true). Ponlo en false para formularios críticos. */
  allowBackdropClose?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Modal/Dialog canónico del design system (Neobrutalism).
 * Cierra con Escape, click en backdrop y botón X. Bloquea el scroll del body,
 * atrapa el foco y lo devuelve al disparador al cerrar.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  allowBackdropClose = true,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Enfoca el primer elemento del diálogo.
    requestAnimationFrame(() => {
      const node = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      node?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (allowBackdropClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'w-full max-w-lg rounded-base border-2 border-border bg-background shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-150',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-border p-5">
          <div className="space-y-1">
            <h2 id={titleId} className="text-2xl font-heading leading-none tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-sm font-sans text-muted-foreground">
                {description}
              </p>
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
