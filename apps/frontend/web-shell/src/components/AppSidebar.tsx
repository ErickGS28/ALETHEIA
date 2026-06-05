'use client';

import { Logo, cn } from '@aletheia/frontend-commons';
import {
  BarChart3,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PenLine,
  Settings,
  Workflow,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type * as React from 'react';

/* ─── Nav data ───────────────────────────────────────────────────────── */
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  requires: string[];
};

const ICON = 'h-[18px] w-[18px]';

const SECTIONS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Módulos',
    items: [
      {
        href: '/solicitudes',
        label: 'Solicitudes',
        icon: <FileText className={ICON} />,
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
        icon: <FileCheck2 className={ICON} />,
        requires: ['TEMPLATES_MANAGE'],
      },
      {
        href: '/documentos',
        label: 'Documentos',
        icon: <FolderOpen className={ICON} />,
        requires: ['DOCUMENT_UPLOAD', 'DOCUMENT_VERSION'],
      },
      {
        href: '/flujo',
        label: 'Flujo de trabajo',
        icon: <Workflow className={ICON} />,
        requires: ['CONTRACT_REVIEW_ADMIN', 'CONTRACT_REVIEW_LAWYER', 'CONTRACT_APPROVE'],
      },
      {
        href: '/firmas',
        label: 'Firmas',
        icon: <PenLine className={ICON} />,
        requires: ['CONTRACT_SIGN'],
      },
    ],
  },
  {
    group: 'Analítica',
    items: [
      {
        href: '/reportes',
        label: 'Reportes',
        icon: <BarChart3 className={ICON} />,
        requires: ['REPORTS_VIEW'],
      },
    ],
  },
  {
    group: 'Sistema',
    items: [
      {
        href: '/admin',
        label: 'Administración',
        icon: <Settings className={ICON} />,
        requires: ['USERS_MANAGE', 'WORKFLOW_CONFIG', 'AREAS_MANAGE', 'APODERADOS_MANAGE'],
      },
    ],
  },
];

/* ─── Component ─────────────────────────────────────────────────────── */
export interface AppSidebarProps {
  role: string;
  email: string;
  roleName: string;
  privileges: string[];
  onLogout: () => void;
  /** Drawer abierto en móvil. */
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({
  role,
  email,
  roleName,
  privileges,
  onLogout,
  mobileOpen = false,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  const canSee = (item: NavItem) =>
    item.requires.length === 0 || item.requires.some((p) => privileges.includes(p));

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const initial = (roleName || role || 'U').charAt(0).toUpperCase();

  const navLink = (href: string, label: string, icon: React.ReactNode) => (
    <a
      href={href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans transition-all',
        isActive(href)
          ? 'border-2 border-border bg-main text-main-foreground shadow-sm'
          : 'text-foreground/70 hover:bg-secondary-background hover:text-foreground',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="leading-tight">{label}</span>
    </a>
  );

  return (
    <>
      {/* Backdrop (solo móvil cuando el drawer está abierto) */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r-2 border-border bg-background transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
          <Logo size={26} variant="full" wordmarkClassName="text-lg" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-base p-1 text-foreground/60 hover:bg-secondary-background md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User */}
        <div className="border-b-2 border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3 py-2 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main font-heading text-sm text-main-foreground">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-heading leading-tight">{roleName || role}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {email || 'Sesión activa'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navLink('/', 'Panel de control', <LayoutDashboard className={ICON} />)}

          {SECTIONS.map((section) => {
            const visible = section.items.filter(canSee);
            if (!visible.length) return null;
            return (
              <div key={section.group}>
                <p className="mb-1.5 px-3 font-heading text-xs uppercase tracking-[0.14em] text-foreground/35">
                  {section.group}
                </p>
                <ul className="space-y-0.5">
                  {visible.map((item) => (
                    <li key={item.href}>{navLink(item.href, item.label, item.icon)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t-2 border-border px-3 py-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans text-foreground/60 transition-all hover:bg-secondary-background hover:text-foreground"
          >
            <LogOut className={ICON} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
