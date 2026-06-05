'use client';

import { AppSidebar } from '@/components/AppSidebar';
import { Badge, Skeleton } from '@aletheia/frontend-commons';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { ROLES } from '../data/roles';
import { useAuth } from '../hooks/useAuth';

/* ─── Module definitions ─────────────────────────────────────────────── */
const MODULES = [
  {
    href: '/solicitudes',
    label: 'Solicitudes',
    description:
      'Crea, envía y da seguimiento a solicitudes de contrato con scoping por área y SLA.',
    requires: [
      'CONTRACT_CREATE',
      'CONTRACT_VIEW_AREA',
      'CONTRACT_VIEW_ALL',
      'CONTRACT_CANCEL',
      'CONTRACT_RECOVER',
    ],
  },
  {
    href: '/contratos',
    label: 'Contratos',
    description: 'Gestiona plantillas con editor WYSIWYG y elabora contratos formales desde ellas.',
    requires: ['TEMPLATES_MANAGE'],
  },
  {
    href: '/documentos',
    label: 'Documentos',
    description:
      'Carga documentos requeridos por tipo de proveedor, versiona y controla su vigencia.',
    requires: ['DOCUMENT_UPLOAD', 'DOCUMENT_VERSION'],
  },
  {
    href: '/flujo',
    label: 'Flujo de trabajo',
    description: 'Panel de revisión y aprobación por rol con semáforo SLA y línea de tiempo.',
    requires: ['CONTRACT_REVIEW_ADMIN', 'CONTRACT_REVIEW_LAWYER', 'CONTRACT_APPROVE'],
  },
  {
    href: '/firmas',
    label: 'Firmas',
    description: 'Firma digital en canvas y gestión de apoderados para contratos autorizados.',
    requires: ['CONTRACT_SIGN'],
  },
  {
    href: '/reportes',
    label: 'Reportes',
    description: 'KPIs por estado, filtros avanzados, exportar CSV y bitácora de auditoría.',
    requires: ['REPORTS_VIEW'],
  },
  {
    href: '/admin',
    label: 'Administración',
    description: 'CRUD de usuarios, áreas y apoderados. Configuración de etapas del flujo.',
    requires: ['USERS_MANAGE', 'WORKFLOW_CONFIG', 'AREAS_MANAGE', 'APODERADOS_MANAGE'],
  },
] as const;

/* ─── Stats ──────────────────────────────────────────────────────────── */
/* Sin backend conectado las métricas se presentan como placeholders (Skeleton). */
const STATS = [
  { label: 'Contratos activos' },
  { label: 'Pendientes de acción' },
  { label: 'Completados este mes' },
  { label: 'Solicitudes nuevas' },
] as const;

/* ─── Component ──────────────────────────────────────────────────────── */
export function RoleDashboard() {
  const { role, email, privileges, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roleMeta = ROLES.find((r) => r.id === role);
  const roleName = roleMeta?.label ?? role;

  const privilegeSet = privileges as readonly string[];
  const canAccess = (requires: readonly string[]) =>
    requires.length === 0 || requires.some((p) => privilegeSet.includes(p));

  const accessibleModules = MODULES.filter((m) => canAccess(m.requires));

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-background">
      {/* Sidebar */}
      <AppSidebar
        role={role ?? ''}
        email={email ?? ''}
        roleName={roleName ?? ''}
        privileges={privileges}
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
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-2 border-border bg-background rounded-base p-5 shadow-shadow"
                  >
                    {/* Métrica aún sin datos: placeholder intencional hasta conectar el backend. */}
                    <Skeleton className="mb-3 h-9 w-16" />
                    <p className="text-xs font-sans leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-sans text-xs text-muted-foreground">
                Las métricas se mostrarán aquí en cuanto se conecte el backend.
              </p>
            </div>

            {/* Module grid */}
            <div>
              <p className="mb-3 text-xs font-heading uppercase tracking-[0.14em] text-muted-foreground">
                Módulos disponibles para tu rol — {accessibleModules.length} de {MODULES.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {accessibleModules.map((mod) => (
                  <a
                    key={mod.href}
                    href={mod.href}
                    aria-label={`Ir al módulo ${mod.label}`}
                    className="group relative border-2 border-border bg-background rounded-base p-5 shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                  >
                    {/* Teal left accent bar */}
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-main" />

                    <div className="mb-2 flex items-start justify-between pl-3">
                      <span className="font-heading text-lg leading-tight">{mod.label}</span>
                      <span
                        aria-hidden="true"
                        className="ml-2 text-lg leading-none text-foreground/30 transition-colors group-hover:text-accent"
                      >
                        →
                      </span>
                    </div>
                    <p className="pl-3 text-sm leading-snug text-muted-foreground">
                      {mod.description}
                    </p>
                    <p className="mt-3 pl-3 font-sans text-xs text-foreground/40">{mod.href}</p>
                  </a>
                ))}

                {/* Locked modules placeholder */}
                {MODULES.filter((m) => !canAccess(m.requires)).map((mod) => (
                  <div
                    key={`locked-${mod.href}`}
                    className="border-2 border-border border-dashed bg-secondary-background/50 rounded-base p-5 opacity-40"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-heading text-lg leading-tight text-foreground/40">
                        {mod.label}
                      </span>
                      <span className="text-xs text-foreground/25 font-sans border border-border/30 px-1.5 py-0.5 rounded">
                        Sin acceso
                      </span>
                    </div>
                    <p className="text-xs text-foreground/30 leading-snug">
                      Sin acceso para este rol
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
