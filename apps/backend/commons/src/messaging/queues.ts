/**
 * Encolamiento durable (BullMQ sobre Redis).
 *
 * A diferencia del transporte pub/sub (`@nestjs/microservices`, fire-and-forget), las colas
 * dan **entrega garantizada, reintentos con backoff y dead-letter** — resolviendo el caveat
 * del ADR-0007 para la saga del ciclo de vida del contrato.
 *
 * Reparto (cada cola tiene UN servicio consumidor):
 *  - WORKFLOW_INBOUND  → consume workflow-service  (eventos que disparan transiciones, ej. firma)
 *  - CONTRACTS_INBOUND → consume contracts-service (espejo del estado del contrato)
 *  - NOTIFICATIONS     → consume workflow-service  (Observer: persiste/entrega notificaciones)
 *  - SLA_SCAN          → consume workflow-service  (job repetible: escala contratos con SLA vencido)
 *
 * Las colas/processors SOLO se registran en el servicio que las usa. auth-service, el CRUD de
 * contracts y el gateway NO encolan: su trabajo es síncrono (request/response) o solo enruta.
 */
export const QUEUES = {
  WORKFLOW_INBOUND: 'workflow-inbound',
  CONTRACTS_INBOUND: 'contracts-inbound',
  NOTIFICATIONS: 'notifications',
  SLA_SCAN: 'sla-scan',
} as const;

/** Nombres de job dentro de cada cola (para discriminar el handler). */
export const JOBS = {
  // WORKFLOW_INBOUND
  CONTRACT_SIGNED: 'contract.signed',
  // CONTRACTS_INBOUND
  STATUS_CHANGED: 'contract.status-changed',
  // NOTIFICATIONS
  NOTIFY: 'notify',
  // SLA_SCAN
  SLA_TICK: 'sla.tick',
} as const;

/** Roles del dominio (espejo del enum Prisma; usado para notificaciones dirigidas por rol). */
export type DomainRole = 'SOLICITANTE' | 'ADMINISTRADOR' | 'ABOGADO' | 'APROBADOR' | 'FIRMANTE';

/** Estados del contrato (espejo de shared-schemas / enum Prisma). */
export type ContractStatusValue =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

/** Job para WORKFLOW_INBOUND / JOBS.CONTRACT_SIGNED: documents-service avisa que se firmó. */
export interface ContractSignedJob {
  contractId: number;
  signedById: number;
}

/** Job para CONTRACTS_INBOUND / JOBS.STATUS_CHANGED: workflow refleja el estado en contracts. */
export interface StatusChangedJob {
  contractId: number;
  status: ContractStatusValue;
  cancelReason?: string | null;
  cancelledAt?: string | null; // ISO; se persiste como Date en contracts
}

/** Job para NOTIFICATIONS / JOBS.NOTIFY: Observer encola la notificación a persistir/entregar. */
export interface NotifyJob {
  /** Destinatario concreto (ej. el solicitante). Si es null, se usa `role`. */
  userId?: number | null;
  /** Destinatario por rol (ej. todos los ABOGADO). El front filtra por rol del usuario. */
  role?: DomainRole | null;
  contractId?: number | null;
  message: string;
}

/**
 * Opciones de conexión BullMQ compartidas (mismo Redis del transporte).
 * Se usa en `BullModule.forRoot({ connection: bullConnection() })`.
 */
export const bullConnection = () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
});

/** Opciones por defecto de los jobs: reintentos con backoff + limpieza. */
export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
