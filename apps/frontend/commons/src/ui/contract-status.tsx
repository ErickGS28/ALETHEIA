import * as React from 'react';
import { cn } from '../utils/cn';
import { Badge } from './badge';

/* ────────────────────────────────────────────────────────────────────────────
 * Estados de contrato y SLA — etiquetas en español y estilos tokenizados.
 * Única fuente de verdad para mostrar estados y semáforo SLA en todos los MFs;
 * evita enums crudos en pantalla (DRAFT, SIGNING…) y colores hex hardcodeados.
 * ──────────────────────────────────────────────────────────────────────────── */

export type ContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado',
  ADMIN_REVIEW: 'Revisión Admin',
  LAWYER_REVIEW: 'Revisión Legal',
  APPROVAL_PENDING: 'Por aprobar',
  SIGNING: 'En firma',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

/** Etiqueta legible para un estado (acepta cualquier string del backend). */
export function contractStatusLabel(status: string): string {
  return CONTRACT_STATUS_LABELS[status as ContractStatus] ?? status;
}

const STATUS_CLASS: Record<ContractStatus, string> = {
  DRAFT: 'bg-secondary-background text-muted-foreground',
  SUBMITTED: 'bg-main/15 text-foreground',
  ADMIN_REVIEW: 'bg-warning/20 text-foreground',
  LAWYER_REVIEW: 'bg-warning/25 text-foreground',
  APPROVAL_PENDING: 'bg-warning/30 text-foreground',
  SIGNING: 'bg-main/25 text-foreground',
  SIGNED: 'bg-success/20 text-foreground',
  REJECTED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-foreground/10 text-muted-foreground',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
}

/** Badge tokenizado para el estado de un contrato. */
export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const cls = STATUS_CLASS[status as ContractStatus] ?? 'bg-secondary-background text-foreground';
  return (
    <Badge variant="neutral" className={cn(cls, className)} {...props}>
      {contractStatusLabel(status)}
    </Badge>
  );
}

/* ─── SLA (semáforo) ─────────────────────────────────────────────────────── */

export type SlaColor = 'green' | 'yellow' | 'red';

/** Calcula el color del semáforo igual que el backend: <60% verde, <100% amarillo, ≥100% rojo. */
export function computeSlaColor(hoursElapsed: number, slaHours: number): SlaColor {
  if (slaHours <= 0) return 'green';
  const ratio = hoursElapsed / slaHours;
  if (ratio < 0.6) return 'green';
  if (ratio < 1) return 'yellow';
  return 'red';
}

const SLA_META: Record<SlaColor, { dot: string; label: string }> = {
  green: { dot: 'bg-success', label: 'En tiempo' },
  yellow: { dot: 'bg-warning', label: 'Por vencer' },
  red: { dot: 'bg-destructive', label: 'Vencido' },
};

export interface SlaIndicatorProps {
  color: SlaColor;
  /** Muestra el texto junto al punto (default true). El texto siempre está disponible para lectores. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Indicador SLA accesible: punto de color + etiqueta textual (no depende solo del color).
 */
export function SlaIndicator({ color, showLabel = true, className }: SlaIndicatorProps) {
  const meta = SLA_META[color];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={`SLA: ${meta.label}`}
    >
      <span
        className={cn('size-2.5 shrink-0 rounded-full border border-border', meta.dot)}
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="text-xs font-sans text-foreground">{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
