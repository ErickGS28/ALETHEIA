// @aletheia/frontend-commons — código compartido del frontend (SOFEA).

// Capa de API (RTK Query) — base compartida, sesión cross-zone y provider por MF
export * from './api/base-api';
export * from './api/session';
export * from './api/ApiProvider';

// Utilidades
export * from './utils/cn';
export * from './utils/sanitize';

// RBAC compartido (roles, privilegios, hook por cookie, guard)
export * from './auth/roles';
export * from './auth/useRole';
export { PrivilegeGuard as CookiePrivilegeGuard } from './auth/PrivilegeGuard';

// Design System (Neobrutalism) — UI primitives
export * from './ui/button';
export * from './ui/card';
export * from './ui/badge';
export * from './ui/input';
export * from './ui/checkbox';
export * from './ui/table';
export * from './ui/dropdown-menu';
export { default as ContractDataTable } from './ui/data-table';

// Editor de texto enriquecido + diseño de documento (plantillas / contratos)
export * from './ui/rich-text-editor';
export * from './ui/page-setup';
export * from './ui/document-preview';
