'use client';

import type { ReactNode } from 'react';
import type { Privilege } from '../data/roles';
import { useAuth } from '../hooks/useAuth';

interface PrivilegeGuardProps {
  privilege: Privilege;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renderiza `children` solo si el usuario tiene el privilegio. */
export function PrivilegeGuard({ privilege, children, fallback = null }: PrivilegeGuardProps) {
  const { can } = useAuth();
  return can(privilege) ? <>{children}</> : <>{fallback}</>;
}
