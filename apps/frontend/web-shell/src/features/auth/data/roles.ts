// Re-exporta el RBAC compartido desde @aletheia/frontend-commons (fuente única).
// El web-shell usa esta matriz con Redux; los microfrontends, vía cookie.
export { PRIVILEGES, ROLES, ROLE_PRIVILEGES } from '@aletheia/frontend-commons';
export type { Privilege, Role, RoleMeta } from '@aletheia/frontend-commons';
