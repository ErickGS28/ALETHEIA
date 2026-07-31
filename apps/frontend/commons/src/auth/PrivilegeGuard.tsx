'use client';

import type { ReactNode } from 'react';
import type { Privilege } from './roles';
import { useRole } from './useRole';

interface PrivilegeGuardProps {
  privilege: Privilege;
  children: ReactNode;
  fallback?: ReactNode;
  /** Qué mostrar mientras la cookie de rol aún no hidrata (evita parpadeo de denegación). */
  loadingFallback?: ReactNode;
}

/** Guard basado en cookie (para microfrontends). Renderiza si hay privilegio. */
export function PrivilegeGuard({
  privilege,
  children,
  fallback = null,
  loadingFallback = null,
}: PrivilegeGuardProps) {
  const { can, ready } = useRole();
  // Durante la hidratación no mostramos el fallback de denegación: evitaría el
  // flash de "Sin permiso" a un usuario que sí tiene el privilegio.
  if (!ready) return <>{loadingFallback}</>;
  return can(privilege) ? <>{children}</> : <>{fallback}</>;
}
