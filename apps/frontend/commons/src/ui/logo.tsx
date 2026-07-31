import * as React from 'react';
import { cn } from '../utils/cn';

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tamaño del isotipo (orca) en px. El wordmark escala en proporción. */
  size?: number;
  /** 'mark' = solo orca · 'full' = orca + wordmark ALETHEIA */
  variant?: 'mark' | 'full';
  /** Color del wordmark. Por defecto hereda currentColor. */
  wordmarkClassName?: string;
}

/**
 * Logo oficial de ALETHEIA (orca + arco teal). Fuente única de marca.
 * Usa el asset /logo.png servido desde el public de cada app (incluye basePath de los MFs).
 */
export function Logo({
  size = 32,
  variant = 'full',
  className,
  wordmarkClassName,
  ...props
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} {...props}>
      {/* biome-ignore lint/a11y/useAltText: alt provisto explícitamente */}
      <img
        src="/logo.png"
        alt="ALETHEIA"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      {variant === 'full' && (
        <span
          className={cn(
            'font-heading leading-none tracking-tight text-foreground',
            wordmarkClassName,
          )}
          style={{ fontSize: size * 0.62 }}
        >
          ALETHEIA
        </span>
      )}
    </span>
  );
}
