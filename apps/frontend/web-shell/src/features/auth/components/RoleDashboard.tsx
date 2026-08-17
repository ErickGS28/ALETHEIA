'use client';

import { AppSidebar } from '@/components/AppSidebar';
import { Badge, Skeleton } from '@aletheia/frontend-commons';
import { Menu } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type DashboardContract, useListContractsForDashboardQuery } from '../api/dashboardApi';
import { ROLES, ROLE_PRIVILEGES } from '../data/roles';
import { useAuth } from '../hooks/useAuth';
import { SignatureArchiveAnimation } from './SignatureArchiveAnimation';

/* ─── Stats ──────────────────────────────────────────────────────────── */
// Etapas con SLA activo (no DRAFT/SIGNED/REJECTED/CANCELLED) — espejo de
// NON_ACTIVE_STATES en contract-state-machine.ts (workflow-service).
const ACTIVE_STATUSES: DashboardContract['status'][] = [
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
  'SIGNING',
];

function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function daysAgo(iso: string, ref: Date, days: number): boolean {
  const diffMs = ref.getTime() - new Date(iso).getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

const STATS: {
  label: string;
  compute: (contracts: DashboardContract[], now: Date) => number;
}[] = [
  {
    label: 'Contratos activos',
    compute: (contracts) => contracts.filter((c) => ACTIVE_STATUSES.includes(c.status)).length,
  },
  {
    // Cola de acción del propio Administrador (ROLE_QUEUE en flujo-mf): SUBMITTED.
    label: 'Pendientes de acción',
    compute: (contracts) => contracts.filter((c) => c.status === 'SUBMITTED').length,
  },
  {
    label: 'Completados este mes',
    compute: (contracts, now) =>
      contracts.filter((c) => c.status === 'SIGNED' && isSameMonth(c.updatedAt, now)).length,
  },
  {
    label: 'Solicitudes nuevas',
    compute: (contracts, now) => contracts.filter((c) => daysAgo(c.createdAt, now, 7)).length,
  },
];

/* ─── Component ──────────────────────────────────────────────────────── */
export function RoleDashboard() {
  const { role, email, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roleMeta = ROLES.find((r) => r.id === role);
  const roleName = roleMeta?.label ?? role;

  // Matriz oficial por rol (no los privilegios crudos del JWT): el usuario admin demo
  // se siembra con todos los privilegios para poder probar cualquier pantalla, pero eso
  // no debe filtrarse a qué muestra el sidebar como disponible para el rol.
  const officialPrivileges = role ? ROLE_PRIVILEGES[role] : [];

  const {
    data: contracts,
    isLoading: statsLoading,
    isError: statsError,
  } = useListContractsForDashboardQuery();

  const statValues = useMemo(() => {
    if (!contracts) return null;
    const now = new Date();
    return STATS.map((stat) => stat.compute(contracts, now));
  }, [contracts]);

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-background">
      {/* Sidebar */}
      <AppSidebar
        role={role ?? ''}
        email={email ?? ''}
        roleName={roleName ?? ''}
        privileges={officialPrivileges}
        onLogout={logout}
        mobileOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-border bg-background px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="rounded-base border-2 border-border p-1.5 text-foreground shadow-sm hover:bg-secondary-background md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-lg leading-none tracking-tight sm:text-xl">
              Panel de control
            </h1>
          </div>
          <Badge variant="secondary">{roleName}</Badge>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* Welcome */}
            <div className="border-b-2 border-border pb-6">
              <h2 className="font-heading text-3xl leading-tight sm:text-4xl">
                Bienvenido, <span className="text-main">{roleName}</span>
              </h2>
              {email && <p className="mt-1.5 font-sans text-sm text-muted-foreground">{email}</p>}
            </div>

            {/* Stats */}
            <div>
              <p className="mb-3 text-xs font-heading uppercase tracking-[0.14em] text-muted-foreground">
                Resumen del sistema
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATS.map((stat, i) => (
                  <div
                    key={stat.label}
                    className="border-2 border-border bg-background rounded-base p-5 shadow-shadow"
                  >
                    {statsLoading ? (
                      <Skeleton className="mb-3 h-9 w-16" />
                    ) : (
                      <p className="mb-1 font-heading text-3xl leading-none tracking-tight">
                        {statValues ? statValues[i] : '—'}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-sans leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              {statsError && (
                <p className="mt-2 font-sans text-xs text-destructive">
                  No se pudieron cargar las métricas.
                </p>
              )}
            </div>

            {/* Hero decorativo — firma y archivo en loop */}
            <div>
              <p className="mb-3 text-xs font-heading uppercase tracking-[0.14em] text-muted-foreground">
                Gestión documental
              </p>
              <SignatureArchiveAnimation />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
