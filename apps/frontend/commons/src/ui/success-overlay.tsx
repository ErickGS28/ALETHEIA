'use client';

import { useEffect } from 'react';
import { Logo } from './logo';

export interface SuccessOverlayProps {
  open: boolean;
  title: string;
  description?: string;
  onDone: () => void;
  /** Ms antes de continuar automáticamente. Default 2200. */
  duration?: number;
}

// Halo de marca detrás del check: teal (main), coral (accent) y verde
// (success) en radios translúcidos — mismo trío de la paleta, no colores
// nuevos. Se dibuja como capas absolutas debajo del contenido.
const BRAND_GLOW = [
  'radial-gradient(circle at 28% 22%, color-mix(in srgb, var(--color-success) 26%, transparent), transparent 55%)',
  'radial-gradient(circle at 78% 78%, color-mix(in srgb, var(--color-main) 22%, transparent), transparent 55%)',
  'radial-gradient(circle at 85% 18%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 50%)',
].join(', ');

/**
 * Momento de celebración para hitos reales del flujo (no para acciones de
 * cola repetitivas): checkmark que se dibuja solo (circle + check) sobre un
 * fondo de marca (grid + halo teal/coral/verde), luego avanza automáticamente.
 * Clic, Enter o Espacio lo saltan para quien no quiera esperar la animación.
 */
export function SuccessOverlay({
  open,
  title,
  description,
  onDone,
  duration = 2200,
}: SuccessOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onDone, duration);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onDone, duration]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDone();
      }}
      className="fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden"
    >
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: BRAND_GLOW }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-background/72 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-6">
        <Logo size={30} className="animate-success-pop" />

        <svg viewBox="0 0 100 100" className="h-24 w-24 animate-success-pop" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            pathLength={100}
            className="animate-success-circle text-success"
          />
          <path
            d="M30 52 L44 66 L72 34"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            className="animate-success-check text-success"
          />
        </svg>

        <div className="animate-success-pop text-center [animation-delay:150ms]">
          <p className="font-heading text-2xl tracking-tight">{title}</p>
          {description ? (
            <p className="mt-1 font-sans text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
