import * as React from 'react';
import { cn } from '../utils/cn';

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof SIZES;
  /** Etiqueta accesible (oculta visualmente). */
  label?: string;
}

/** Indicador de carga circular, accesible (role=status). */
export function Spinner({ size = 'md', label = 'Cargando…', className, ...props }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex', className)} {...props}>
      <span
        className={cn(
          'inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em]',
          SIZES[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
