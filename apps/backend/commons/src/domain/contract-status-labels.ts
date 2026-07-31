export type ContractStatusLabelKey =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Etiquetas en español para el estado de un contrato.
 * Espejo de `apps/frontend/commons/src/ui/contract-status.tsx` (fuente de verdad
 * para el frontend) — mantener ambos sincronizados si cambia alguno.
 */
export const CONTRACT_STATUS_LABELS_ES: Record<ContractStatusLabelKey, string> = {
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

/** Etiqueta legible para un estado (acepta cualquier string, incluso desconocido). */
export function contractStatusLabel(status: string): string {
  return CONTRACT_STATUS_LABELS_ES[status as ContractStatusLabelKey] ?? status;
}
