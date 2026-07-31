import type { DomainRole } from '@aletheia/backend-commons';

/**
 * Patrón State Machine — el corazón del workflow-service.
 *
 * Define la tabla de transiciones autoritativa del ciclo de vida del contrato.
 * Cada regla declara:
 *  - next:       el estado resultante.
 *  - privilege:  el privilegio que el usuario DEBE tener para ejecutar la acción
 *                en el estado actual (si no lo tiene -> ForbiddenException).
 *  - notifyRole: rol al que se notifica tras la transición (Observer dirigido por rol).
 *  - notifyCreator: si es true, la notificación va al creador (createdById) en vez de a un rol.
 */

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

export type WorkflowActionName =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN'
  | 'CANCEL'
  | 'RECOVER'
  | 'SIGN';

export interface TransitionRule {
  next: ContractStatus;
  privilege: string;
  /** Rol notificado tras la transición (excluyente con notifyCreator). */
  notifyRole?: DomainRole;
  /** Si es true, se notifica al creador del contrato (createdById). */
  notifyCreator?: boolean;
}

/** Estados terminales o de borrador que NO tienen etapa activa de SLA. */
export const NON_ACTIVE_STATES: ReadonlySet<ContractStatus> = new Set<ContractStatus>([
  'DRAFT',
  'REJECTED',
  'CANCELLED',
  'SIGNED',
]);

/** Estados desde los que se permite CANCEL. */
const CANCELLABLE_STATES: ContractStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
  'SIGNING',
];

/**
 * Tabla de transiciones: estadoActual -> acción -> regla.
 * Cualquier par (estado, acción) no listado es una transición ilegal.
 */
const TRANSITIONS: Partial<
  Record<ContractStatus, Partial<Record<WorkflowActionName, TransitionRule>>>
> = {
  DRAFT: {
    SUBMIT: { next: 'SUBMITTED', privilege: 'CONTRACT_SUBMIT', notifyRole: 'ADMINISTRADOR' },
  },
  SUBMITTED: {
    APPROVE: { next: 'ADMIN_REVIEW', privilege: 'CONTRACT_REVIEW_ADMIN', notifyRole: 'ABOGADO' },
    REJECT: { next: 'DRAFT', privilege: 'CONTRACT_REVIEW_ADMIN', notifyCreator: true },
    RETURN: { next: 'DRAFT', privilege: 'CONTRACT_REVIEW_ADMIN', notifyCreator: true },
  },
  ADMIN_REVIEW: {
    APPROVE: {
      next: 'LAWYER_REVIEW',
      privilege: 'CONTRACT_REVIEW_LAWYER',
      notifyRole: 'APROBADOR',
    },
    REJECT: { next: 'DRAFT', privilege: 'CONTRACT_REVIEW_LAWYER', notifyCreator: true },
    RETURN: { next: 'DRAFT', privilege: 'CONTRACT_REVIEW_LAWYER', notifyCreator: true },
  },
  LAWYER_REVIEW: {
    APPROVE: { next: 'APPROVAL_PENDING', privilege: 'CONTRACT_APPROVE', notifyRole: 'FIRMANTE' },
    REJECT: { next: 'REJECTED', privilege: 'CONTRACT_APPROVE', notifyCreator: true },
    RETURN: { next: 'DRAFT', privilege: 'CONTRACT_APPROVE', notifyCreator: true },
  },
  APPROVAL_PENDING: {
    APPROVE: { next: 'SIGNING', privilege: 'CONTRACT_SIGN', notifyRole: 'FIRMANTE' },
  },
  SIGNING: {
    SIGN: { next: 'SIGNED', privilege: 'CONTRACT_SIGN', notifyCreator: true },
  },
  CANCELLED: {
    RECOVER: { next: 'DRAFT', privilege: 'CONTRACT_RECOVER', notifyCreator: true },
  },
};

// Inyecta la transición CANCEL en todos los estados cancelables.
for (const state of CANCELLABLE_STATES) {
  const bucket = TRANSITIONS[state] ?? {};
  bucket.CANCEL = { next: 'CANCELLED', privilege: 'CONTRACT_CANCEL', notifyCreator: true };
  TRANSITIONS[state] = bucket;
}

/**
 * Resuelve la regla de transición para (estado, acción).
 * Devuelve undefined si la transición es ilegal.
 */
export function resolveTransition(
  status: ContractStatus,
  action: WorkflowActionName,
): TransitionRule | undefined {
  return TRANSITIONS[status]?.[action];
}

/**
 * Mapa estado -> orden de la etapa activa (para resolver stageId y SLA).
 * SUBMITTED -> orden 1 (ADMINISTRADOR)
 * ADMIN_REVIEW -> orden 2 (ABOGADO)
 * LAWYER_REVIEW -> orden 3 (APROBADOR)
 * APPROVAL_PENDING / SIGNING -> orden 4 (FIRMANTE)
 * Estados sin etapa activa usan la etapa orden 1 como placeholder de stageId,
 * pero el SLA no aplica (ver NON_ACTIVE_STATES).
 */
export function stageOrderForStatus(status: ContractStatus): number {
  switch (status) {
    case 'SUBMITTED':
      return 1;
    case 'ADMIN_REVIEW':
      return 2;
    case 'LAWYER_REVIEW':
      return 3;
    case 'APPROVAL_PENDING':
    case 'SIGNING':
      return 4;
    default:
      // DRAFT / REJECTED / CANCELLED / SIGNED: placeholder orden 1.
      return 1;
  }
}

/** True si el estado tiene etapa activa y por tanto aplica el cálculo de SLA. */
export function hasActiveStage(status: ContractStatus): boolean {
  return !NON_ACTIVE_STATES.has(status);
}
