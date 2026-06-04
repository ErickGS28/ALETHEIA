'use client';

import { AppSidebar } from '@/components/AppSidebar';
import { Badge } from '@aletheia/frontend-commons';
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
const STATS = [
  { label: 'Contratos activos', value: '—' },
  { label: 'Pendientes de acción', value: '—' },
  { label: 'Completados este mes', value: '—' },
  { label: 'Solicitudes nuevas', value: '—' },
] as const;

/* ─── Component ──────────────────────────────────────────────────────── */
export function RoleDashboard() {
  const { role, email, privileges, logout } = useAuth();
  const roleMeta = ROLES.find((r) => r.id === role);
  const roleName = roleMeta?.label ?? role;

  const canAccess = (requires: readonly string[]) =>
    requires.length === 0 || requires.some((p) => privileges.includes(p));

  const accessibleModules = MODULES.filter((m) => canAccess(m.requires));

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-background">
      {/* Sidebar */}
      <AppSidebar
        role={role}
        email={email}
        roleName={roleName}
        privileges={privileges}
        onLogout={logout}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between border-b-2 border-border bg-background px-8 py-4">
          <h1 className="font-heading text-xl leading-none tracking-tight">Panel de control</h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{roleName}</Badge>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8 space-y-8">
            {/* Welcome */}
            <div className="border-b-2 border-border pb-6">
              <h2 className="font-heading text-4xl leading-tight">
                Bienvenido, <span style={{ color: '#15a8b5' }}>{roleName}</span>
              </h2>
              {email && <p className="text-sm text-foreground/45 mt-1.5 font-sans">{email}</p>}
            </div>

            {/* Stats */}
            <div>
              <p className="text-xs font-heading uppercase tracking-[0.14em] text-foreground/35 mb-3">
                Resumen del sistema
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-2 border-border bg-background rounded-base p-5 shadow-shadow"
                  >
                    <p className="font-heading text-4xl leading-none mb-2 text-foreground/20">
                      {stat.value}
                    </p>
                    <p className="text-xs font-sans text-foreground/50 leading-snug">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-foreground/30 font-sans">
                Conecta el backend para ver estadísticas en tiempo real.
              </p>
            </div>

            {/* Module grid */}
            <div>
              <p className="text-xs font-heading uppercase tracking-[0.14em] text-foreground/35 mb-3">
                Módulos disponibles para tu rol — {accessibleModules.length} de {MODULES.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {accessibleModules.map((mod) => (
                  <a
                    key={mod.href}
                    href={mod.href}
                    className="group relative border-2 border-border bg-background rounded-base p-5 shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
                  >
                    {/* Teal left accent bar */}
                    <div
                      className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                      style={{ background: '#15a8b5' }}
                    />

                    <div className="flex items-start justify-between mb-2 pl-3">
                      <span className="font-heading text-lg leading-tight">{mod.label}</span>
                      <span className="text-foreground/25 group-hover:text-foreground/70 transition-colors text-lg leading-none ml-2">
                        →
                      </span>
                    </div>
                    <p className="text-sm text-foreground/50 leading-snug pl-3">
                      {mod.description}
                    </p>
                    <p className="mt-3 text-xs text-foreground/25 font-sans pl-3">{mod.href}</p>
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
