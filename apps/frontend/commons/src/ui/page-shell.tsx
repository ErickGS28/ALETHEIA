import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

const MAX_WIDTH = {
  sm: 'max-w-3xl', // formularios enfocados
  md: 'max-w-4xl', // detalle
  lg: 'max-w-6xl', // listados / dashboards
  full: 'max-w-none',
} as const;

export interface PageShellProps {
  children: ReactNode;
  /** Ancho del contenedor según el tipo de vista. */
  width?: keyof typeof MAX_WIDTH;
  /** Fondo de cuadrícula Neobrutalism (por defecto activo). */
  grid?: boolean;
  className?: string;
}

/**
 * Cascarón de página canónico: fondo + contenedor centrado + espaciado y padding
 * responsive consistentes. Reemplaza el boilerplate `<main bg-grid min-h-screen p-6>`
 * copiado en cada MF y unifica los anchos máximos (antes 3xl/4xl/5xl/6xl al azar).
 */
export function PageShell({ children, width = 'lg', grid = true, className }: PageShellProps) {
  return (
    <main className={cn('min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-8', grid && 'bg-grid')}>
      <div className={cn('mx-auto space-y-6', MAX_WIDTH[width], className)}>{children}</div>
    </main>
  );
}
