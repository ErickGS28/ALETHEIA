// Display metadata for contract statuses and audit actions (Spanish UI copy).
// Mirrors the backend `status` enum and the audit `action` strings.

import type { ContractStatus } from '../features/contract-reports/api/reportsApi';

export interface ContractStatusMeta {
  id: ContractStatus;
  /** Spanish label shown in the UI. */
  label: string;
  /** Badge variant from the design system. */
  variant: 'default' | 'secondary' | 'destructive' | 'neutral' | 'outline';
}

export const CONTRACT_STATUSES: ContractStatusMeta[] = [
  { id: 'DRAFT', label: 'Borrador', variant: 'neutral' },
  { id: 'SUBMITTED', label: 'Enviado', variant: 'secondary' },
  { id: 'ADMIN_REVIEW', label: 'Revisión admin.', variant: 'secondary' },
  { id: 'LAWYER_REVIEW', label: 'Revisión legal', variant: 'secondary' },
  { id: 'APPROVAL_PENDING', label: 'Pend. aprobación', variant: 'secondary' },
  { id: 'SIGNING', label: 'En firma', variant: 'default' },
  { id: 'SIGNED', label: 'Firmado', variant: 'default' },
  { id: 'REJECTED', label: 'Rechazado', variant: 'destructive' },
  { id: 'CANCELLED', label: 'Cancelado', variant: 'destructive' },
];

export function statusMeta(status: ContractStatus): ContractStatusMeta {
  return (
    CONTRACT_STATUSES.find((s) => s.id === status) ?? {
      id: status,
      label: status,
      variant: 'neutral',
    }
  );
}

export function statusLabel(status: ContractStatus): string {
  return statusMeta(status).label;
}

/* ─── Audit actions ───────────────────────────────────────────────────── */
// The backend stores free-form action strings; map the known ones to Spanish.

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Contrato creado',
  EDITED: 'Edición de datos',
  SUBMITTED: 'Enviado a revisión',
  ADMIN_APPROVED: 'Aprobado por administrador',
  LAWYER_APPROVED: 'Aprobado por abogado',
  LAWYER_REJECTED: 'Rechazado por abogado',
  APPROVED: 'Aprobado',
  APPROVE: 'Aprobado',
  REJECTED: 'Rechazado',
  REJECT: 'Rechazado',
  RETURN: 'Devuelto',
  RETURNED: 'Devuelto',
  SIGNED: 'Firmado',
  SIGN: 'Firmado',
  CANCELLED: 'Cancelado',
  CANCEL: 'Cancelado',
  RECOVERED: 'Recuperado',
  RECOVER: 'Recuperado',
  DOCUMENT_UPLOADED: 'Documento subido',
  ASSIGNED: 'Responsable asignado',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
