'use client';

import { ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { buttonVariants } from './button';

export interface BackButtonProps {
  /** Destino de navegación atrás (ancla). Para volver al host usa `crossZone`. */
  href?: string;
  /** Si true, navega al host con recarga completa (Multi-Zones). Ignora href. */
  crossZone?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
}

/**
 * Botón "Volver" unificado del design system. Único patrón de navegación atrás:
 * - intra-MF: pasa `href`
 * - al host (cross-zone): pasa `crossZone` (ancla a "/", recarga completa por diseño)
 * - acción imperativa: pasa `onClick`
 *
 * Usa ancla nativa (no next/link) para mantener commons desacoplado del framework.
 */
export function BackButton({
  href,
  crossZone,
  onClick,
  label = 'Volver',
  className,
}: BackButtonProps) {
  const cls = cn(buttonVariants({ variant: 'outline', size: 'sm' }), className);
  const content = (
    <>
      <ArrowLeft />
      {label}
    </>
  );

  if (crossZone || href) {
    return (
      <a href={crossZone ? '/' : href} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}
