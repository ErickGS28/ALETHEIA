// RBAC compartido — catálogo de privilegios y matriz rol → privilegios.
// Fuente: docs/01-architecture/implementacion.md §7. Única fuente de verdad
// consumida por el web-shell (Redux) y por los microfrontends (cookie).

export const PRIVILEGES = {
  CONTRACT_CREATE: 'Crear solicitud',
  CONTRACT_EDIT: 'Editar solicitud',
  CONTRACT_SUBMIT: 'Enviar a revisión',
  CONTRACT_CANCEL: 'Cancelar contrato',
  CONTRACT_RECOVER: 'Recuperar contrato',
  CONTRACT_REVIEW_ADMIN: 'Revisar (Administrador)',
  CONTRACT_REVIEW_LAWYER: 'Revisar (Abogado)',
  CONTRACT_APPROVE: 'Aprobar contrato',
  CONTRACT_SIGN: 'Firmar contrato',
  CONTRACT_VIEW_ALL: 'Ver todos los contratos',
  CONTRACT_VIEW_AREA: 'Ver contratos de mi área',
  DOCUMENT_UPLOAD: 'Subir documentos',
  DOCUMENT_VERSION: 'Versionar documentos',
  WORKFLOW_CONFIG: 'Configurar flujo',
  USERS_MANAGE: 'Gestionar usuarios',
  AREAS_MANAGE: 'Gestionar áreas',
  APODERADOS_MANAGE: 'Gestionar apoderados',
  TEMPLATES_MANAGE: 'Gestionar plantillas',
  REPORTS_VIEW: 'Ver reportes',
} as const;

export type Privilege = keyof typeof PRIVILEGES;
export type Role = 'SOLICITANTE' | 'ADMINISTRADOR' | 'ABOGADO' | 'APROBADOR' | 'FIRMANTE';

export const ROLE_PRIVILEGES: Record<Role, Privilege[]> = {
  SOLICITANTE: [
    'CONTRACT_CREATE',
    'CONTRACT_EDIT',
    'CONTRACT_SUBMIT',
    'CONTRACT_CANCEL',
    'CONTRACT_RECOVER',
    'CONTRACT_VIEW_AREA',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_VERSION',
  ],
  ADMINISTRADOR: [
    'CONTRACT_CANCEL',
    'CONTRACT_RECOVER',
    'CONTRACT_REVIEW_ADMIN',
    'CONTRACT_VIEW_ALL',
    'DOCUMENT_VERSION',
    'WORKFLOW_CONFIG',
    'USERS_MANAGE',
    'AREAS_MANAGE',
    'APODERADOS_MANAGE',
    'TEMPLATES_MANAGE',
    'REPORTS_VIEW',
  ],
  ABOGADO: [
    'CONTRACT_REVIEW_LAWYER',
    'CONTRACT_VIEW_AREA',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_VERSION',
    'TEMPLATES_MANAGE',
    'REPORTS_VIEW',
  ],
  APROBADOR: ['CONTRACT_APPROVE', 'CONTRACT_VIEW_AREA', 'REPORTS_VIEW'],
  FIRMANTE: ['CONTRACT_SIGN', 'CONTRACT_VIEW_AREA'],
};

export interface RoleMeta {
  id: Role;
  label: string;
  description: string;
}

export const ROLES: RoleMeta[] = [
  { id: 'SOLICITANTE', label: 'Solicitante', description: 'Crea y envía solicitudes de contrato.' },
  {
    id: 'ADMINISTRADOR',
    label: 'Administrador',
    description: 'Revisa, configura el sistema y gestiona usuarios.',
  },
  { id: 'ABOGADO', label: 'Abogado', description: 'Revisa legalmente y gestiona plantillas.' },
  { id: 'APROBADOR', label: 'Aprobador', description: 'Aprueba formalmente los contratos.' },
  { id: 'FIRMANTE', label: 'Firmante', description: 'Firma los contratos autorizados.' },
];
