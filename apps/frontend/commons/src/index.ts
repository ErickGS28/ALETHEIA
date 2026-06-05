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
export * from './ui/logo';
export * from './ui/button';
export * from './ui/spinner';
export * from './ui/card';
export * from './ui/badge';
export * from './ui/input';
export * from './ui/label';
export * from './ui/textarea';
export * from './ui/select';
export * from './ui/form-field';
export * from './ui/checkbox';
export * from './ui/table';
export * from './ui/skeleton';
export * from './ui/dropdown-menu';
export * from './ui/modal';
export * from './ui/confirm-dialog';
export * from './ui/states';
export * from './ui/toast';
export * from './ui/contract-status';
export * from './ui/back-button';
export * from './ui/page-header';
export * from './ui/page-shell';
export { default as ContractDataTable } from './ui/data-table';

// Editor de texto enriquecido + diseño de documento (plantillas / contratos)
export * from './ui/rich-text-editor';
export * from './ui/page-setup';
export * from './ui/document-preview';
