/**
 * Patrones de mensajes Redis (request/response) entre el gateway y los microservicios.
 * Convención: '<servicio>.<accion>'. El gateway usa ClientProxy.send(pattern, payload)
 * y cada servicio responde con @MessagePattern(pattern).
 *
 * Los efectos asíncronos y durables (notificaciones, espejo de estado, firma → workflow)
 * NO viajan por aquí: usan las colas BullMQ definidas en './queues'.
 */
export const AUTH_PATTERNS = {
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
} as const;

export const USERS_PATTERNS = {
  CREATE: 'users.create',
  FIND_ALL: 'users.findAll',
  FIND_ONE: 'users.findOne',
  UPDATE: 'users.update',
  REMOVE: 'users.remove',
} as const;

export const CONTRACTS_PATTERNS = {
  CREATE: 'contracts.create',
  FIND_ALL: 'contracts.findAll',
  FIND_ONE: 'contracts.findOne',
  UPDATE: 'contracts.update',
  PING: 'contracts.ping',
} as const;

/** Catálogos del dominio contracts: sociedades, áreas, apoderados y plantillas. */
export const CATALOGS_PATTERNS = {
  SOCIETY_FIND_ALL: 'catalogs.society.findAll',
  SOCIETY_CREATE: 'catalogs.society.create',
  SOCIETY_UPDATE: 'catalogs.society.update',
  AREA_FIND_ALL: 'catalogs.area.findAll',
  AREA_CREATE: 'catalogs.area.create',
  AREA_UPDATE: 'catalogs.area.update',
  APODERADO_FIND_ALL: 'catalogs.apoderado.findAll',
  APODERADO_CREATE: 'catalogs.apoderado.create',
  APODERADO_UPDATE: 'catalogs.apoderado.update',
  TEMPLATE_FIND_ALL: 'catalogs.template.findAll',
  TEMPLATE_FIND_ONE: 'catalogs.template.findOne',
  TEMPLATE_CREATE: 'catalogs.template.create',
  TEMPLATE_UPDATE: 'catalogs.template.update',
} as const;

export const WORKFLOW_PATTERNS = {
  /** Estado del flujo de un contrato: etapa actual, SLA calculado e historial. */
  GET: 'workflow.get',
  /** Comando único de transición del State Machine (submit/approve/reject/return/cancel/recover/sign). */
  TRANSITION: 'workflow.transition',
  /** Bitácora (AuditLog) de un contrato — usado por /reports/audit/:id. */
  AUDIT: 'workflow.audit',
  STAGE_FIND_ALL: 'workflow.stage.findAll',
  STAGE_CREATE: 'workflow.stage.create',
  STAGE_UPDATE: 'workflow.stage.update',
  PING: 'workflow.ping',
} as const;

export const NOTIFICATIONS_PATTERNS = {
  FIND_ALL: 'notifications.findAll',
  MARK_READ: 'notifications.markRead',
} as const;

export const DOCUMENTS_PATTERNS = {
  /** Sube/crea un documento (nueva versión inicial). */
  CREATE: 'documents.create',
  FIND_BY_CONTRACT: 'documents.findByContract',
  /** Lista de documentos requeridos según tipo de proveedor (Factory). */
  REQUIRED: 'documents.required',
  VERSION_FIND: 'documents.version.find',
  VERSION_CREATE: 'documents.version.create',
  PING: 'documents.ping',
} as const;

export const SIGNATURES_PATTERNS = {
  CREATE: 'signatures.create',
  FIND_BY_CONTRACT: 'signatures.findByContract',
} as const;

/** Tokens de inyección para los ClientProxy del gateway (request/response). */
export const SERVICE_CLIENTS = {
  AUTH: 'AUTH_SERVICE',
  CONTRACTS: 'CONTRACTS_SERVICE',
  WORKFLOW: 'WORKFLOW_SERVICE',
  DOCUMENTS: 'DOCUMENTS_SERVICE',
} as const;
