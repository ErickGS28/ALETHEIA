// Domain types + presentation metadata for solicitudes-mf (CLM).
// Data now comes from the backend (RTK Query); this module holds the UI-facing
// types, status/SLA labels and the adapter that maps backend shapes → UI shape.

export type ContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'CANCELLED'
  | 'REJECTED';

export type ProviderType = 'PERSONA_FISICA' | 'PERSONA_MORAL';

export interface AuditEntry {
  /** Action label (e.g. "Creó la solicitud" or backend action code). */
  action: string;
  /** Display name / id of the user who performed the action. */
  user: string;
  /** ISO timestamp. */
  date: string;
  /** Optional free-text note (e.g. cancellation reason). */
  note?: string;
}

/**
 * UI-facing contract shape consumed by the views. Built from the backend
 * `BackendContract` via {@link adaptContract}. Keeps `area`/`society` as display
 * names (from the relation) plus their numeric ids for forms.
 */
export interface Contract {
  /** Backend numeric id rendered as string for routing/keys. */
  id: string;
  /** Raw numeric id (backend). */
  numericId: number;
  folio: string;
  title: string;
  society: string;
  societyId: number;
  providerName: string;
  providerEmail: string;
  providerType: ProviderType;
  area: string;
  areaId: number;
  status: ContractStatus;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  /** Audit trail (bitácora); loaded separately on the detail view. */
  log: AuditEntry[];
}

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  PERSONA_FISICA: 'Persona Física',
  PERSONA_MORAL: 'Persona Moral',
};

/* ─── Status metadata ────────────────────────────────────────────────── */

export const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviada',
  ADMIN_REVIEW: 'Revisión Admin.',
  LAWYER_REVIEW: 'Revisión Legal',
  APPROVAL_PENDING: 'Pend. Aprobación',
  SIGNING: 'En Firma',
  SIGNED: 'Firmada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rechazada',
};

/** Tailwind classes for the status pill (neobrutalism palette). */
export const STATUS_COLOR: Record<ContractStatus, string> = {
  DRAFT: 'bg-secondary-background text-foreground',
  SUBMITTED: 'bg-main text-main-foreground',
  ADMIN_REVIEW: 'bg-yellow-400 text-black',
  LAWYER_REVIEW: 'bg-orange-400 text-black',
  APPROVAL_PENDING: 'bg-blue-400 text-black',
  SIGNING: 'bg-purple-400 text-black',
  SIGNED: 'bg-green-500 text-white',
  CANCELLED: 'bg-zinc-400 text-black',
  REJECTED: 'bg-red-500 text-white',
};

export const STATUS_ORDER: ContractStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
  'SIGNING',
  'SIGNED',
];

/* ─── SLA semaphore ──────────────────────────────────────────────────── */

export type SlaLevel = 'green' | 'yellow' | 'red';

export const SLA_META: Record<SlaLevel, { label: string; dot: string; text: string }> = {
  green: { label: 'En tiempo', dot: 'bg-green-500', text: 'text-green-700' },
  yellow: { label: 'Por vencer', dot: 'bg-yellow-400', text: 'text-yellow-700' },
  red: { label: 'Vencido', dot: 'bg-red-500', text: 'text-red-700' },
};

/** Maps the backend workflow SLA color → UI SlaLevel. */
export function slaFromColor(color: 'GREEN' | 'YELLOW' | 'RED'): SlaLevel {
  if (color === 'RED') return 'red';
  if (color === 'YELLOW') return 'yellow';
  return 'green';
}

/**
 * Fallback SLA when no workflow data is available (e.g. in the listing).
 * Terminal/draft states are always green; otherwise derive from how long the
 * contract has been sitting since its last update.
 */
export function computeSla(contract: Pick<Contract, 'status' | 'updatedAt'>): SlaLevel {
  if (contract.status === 'SIGNED') return 'green';
  if (contract.status === 'CANCELLED' || contract.status === 'REJECTED') return 'green';
  if (contract.status === 'DRAFT') return 'green';

  const days = Math.floor(
    (Date.now() - new Date(contract.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 5) return 'red';
  if (days >= 2) return 'yellow';
  return 'green';
}
