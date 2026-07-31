'use client';

import { AuthSplash, RoleDashboard, RoleLogin, useAuth } from '@/features/auth';
import type { Role } from '@/features/auth';
import { useEffect } from 'react';

const ROLE_HOME: Partial<Record<Role, string>> = {
  SOLICITANTE: '/solicitudes',
  ABOGADO: '/flujo',
  APROBADOR: '/flujo',
  FIRMANTE: '/firmas',
};

export default function Home() {
  const { isAuthenticated, hydrated, role } = useAuth();

  useEffect(() => {
    if (hydrated && isAuthenticated && role && role !== 'ADMINISTRADOR') {
      window.location.replace(ROLE_HOME[role] ?? '/solicitudes');
    }
  }, [hydrated, isAuthenticated, role]);

  if (!hydrated) return <AuthSplash />;
  if (!isAuthenticated) return <RoleLogin />;
  if (role !== 'ADMINISTRADOR') return <AuthSplash />;
  return <RoleDashboard />;
}
