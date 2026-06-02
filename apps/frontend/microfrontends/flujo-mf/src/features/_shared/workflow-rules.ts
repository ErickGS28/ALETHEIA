// Pure domain helpers for the review workflow: status labels, SLA math,
// role → queue mapping and the transition state machine. No React, no I/O.

import type { Privilege, Role } from '@aletheia/frontend-commons';
import type { ContractStatus, TransitionAction } from './adapters';

// Stages, in flow order, that carry an SLA budget (the active review stages).
export const SLA_TRACKED_STATUSES: ContractStatus[] = [
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
];

// ─── Status presentation ──────────────────────────────────────────────────

export const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado',
  ADMIN_REVIEW: 'Revisión Administrador',
  LAWYER_REVIEW: 'Revisión Abogado',
  APPROVAL_PENDING: 'Pendiente de aprobación',
  SIGNING: 'En firma',
  SIGNED: 'Firmado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'neutral' | 'outline';

export function statusBadgeVariant(status: ContractStatus): BadgeVariant {
  switch (status) {
    case 'SIGNING':
    case 'SIGNED':
      return 'default';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive';
    case 'DRAFT':
      return 'neutral';
    default:
      return 'secondary';
  }
}

export const ACTION_LABELS: Record<TransitionAction, string> = {
  SUBMIT: 'Envío a revisión',
  APPROVE: 'Aprobación',
  RETURN: 'Devolución',
  REJECT: 'Rechazo',
  RECOVER: 'Recuperación',
};

// ─── Role ↔ queue mapping ─────────────────────────────────────────────────

/** Statuses each role is responsible for reviewing. */
export const ROLE_QUEUE: Partial<Record<Role, ContractStatus[]>> = {
  ADMINISTRADOR: ['SUBMITTED', 'ADMIN_REVIEW'],
  ABOGADO: ['LAWYER_REVIEW'],
  APROBADOR: ['APPROVAL_PENDING'],
};

/** Privilege required to act on a given role's queue. */
export const ROLE_REVIEW_PRIVILEGE: Partial<Record<Role, Privilege>> = {
  ADMINISTRADOR: 'CONTRACT_REVIEW_ADMIN',
  ABOGADO: 'CONTRACT_REVIEW_LAWYER',
  APROBADOR: 'CONTRACT_APPROVE',
};

/** Shared copy shown when the active role lacks the required privilege. */
export const PRIVILEGE_NOT_GRANTED =
  'Tu rol actual no cuenta con el privilegio necesario para esta acción. Cambia de rol desde el shell para continuar.';

/** Returns the statuses visible to a role's review panel. */
export function queueStatusesForRole(role: Role | null): ContractStatus[] {
  if (!role) return [];
  return ROLE_QUEUE[role] ?? [];
}

// ─── Transition state machine ─────────────────────────────────────────────

/** Result of advancing a contract one stage forward (approve). */
export function nextStatusOnApprove(status: ContractStatus): ContractStatus | null {
  switch (status) {
    case 'SUBMITTED':
      return 'ADMIN_REVIEW';
    case 'ADMIN_REVIEW':
      return 'LAWYER_REVIEW';
    case 'LAWYER_REVIEW':
      return 'APPROVAL_PENDING';
    case 'APPROVAL_PENDING':
      return 'SIGNING';
    default:
      return null;
  }
}

/** Spanish label for the approve action, contextual to the stage. */
export function approveLabel(status: ContractStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Iniciar revisión';
    case 'APPROVAL_PENDING':
      return 'Aprobar y enviar a firma';
    default:
      return 'Aprobar';
  }
}

/** Whether the approver can issue a definitive rejection (→ REJECTED). */
export function canDefinitiveReject(status: ContractStatus): boolean {
  return status === 'APPROVAL_PENDING';
}

// ─── SLA semaphore types (HU-12) ──────────────────────────────────────────
// The semaphore color is computed by the backend (GREEN/YELLOW/RED) and mapped
// to these levels in `adapters.toSlaResult`. The UI only consumes SlaResult.

export type SlaLevel = 'green' | 'yellow' | 'red' | 'none';

export interface SlaResult {
  level: SlaLevel;
  /** Hours elapsed since entering the current stage. */
  elapsedHours: number;
  /** SLA budget for the current stage (null when not tracked). */
  slaHours: number | null;
  /** Consumed fraction (0..n), null when not tracked. */
  ratio: number | null;
  /** Hours left before breaching SLA (negative when overdue). */
  remainingHours: number | null;
  label: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────

const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  try {
    return dateTimeFmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Human duration like "2 d 5 h" or "3 h" or "45 min". */
export function formatDuration(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60)); // minutes
  const days = Math.floor(total / (60 * 24));
  const hrs = Math.floor((total % (60 * 24)) / 60);
  const mins = total % 60;
  if (days > 0) return `${days} d ${hrs} h`;
  if (hrs > 0) return `${hrs} h ${mins} min`;
  return `${mins} min`;
}
