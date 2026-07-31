'use client';

import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { BackButton } from './back-button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Navegación atrás intra-MF (next/link). */
  backHref?: string;
  /** Botón "Volver" al host (cross-zone, recarga completa). */
  backToHome?: boolean;
  backLabel?: string;
  /** Chip de rol u otro contenido a la derecha del título. */
  badge?: ReactNode;
  /** Acciones a la derecha (botones). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Header de página canónico: posición y jerarquía consistentes en toda la app.
 * El botón "Volver" siempre va arriba a la izquierda, sobre el título.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backToHome,
  backLabel,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const showBack = backToHome || backHref;
  return (
    <header className={cn('space-y-3', className)}>
      {showBack ? (
        <BackButton
          href={backHref}
          crossZone={backToHome}
          label={backLabel ?? (backToHome ? 'Inicio' : 'Volver')}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle ? <p className="font-sans text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {badge || actions ? (
          <div className="flex flex-wrap items-center gap-3">
            {badge}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
