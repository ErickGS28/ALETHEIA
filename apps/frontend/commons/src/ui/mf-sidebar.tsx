'use client';

import {
  BarChart3,
  FileCheck2,
  FileText,
  FolderOpen,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Workflow,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { clearSession } from '../api/session';
import { type Privilege, ROLES } from '../auth/roles';
import { useRole } from '../auth/useRole';
import { cn } from '../utils/cn';
import { Logo } from './logo';

/* ─── Nav data (espejo de AppSidebar del web-shell) ─────────────────── */
type NavItem = { href: string; label: string; icon: ReactNode; requires: Privilege[] };
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

/**
 * Shell con sidebar para microfrontends. Reemplaza el body layout de cada MF
 * para dar navegación consistente sin depender del store Redux del web-shell.
 * Lee rol y privilegios desde la cookie `aletheia_role` (escrita al login).
 */
export function MfSidebar({ children }: { children: ReactNode }) {
  const { role, privileges, ready } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const roleName = role ? (ROLES.find((r) => r.id === role)?.label ?? role) : '';
  const initial = (roleName || '?').charAt(0).toUpperCase();

  const canSee = (item: NavItem) =>
    item.requires.length === 0 || item.requires.some((p) => privileges.includes(p));

  const isActive = (href: string) => pathname.startsWith(href);

  const handleLogout = () => {
    clearSession();
    window.location.replace('/');
  };

  const navLink = (href: string, label: string, icon: ReactNode) => (
    <a
      key={href}
      href={href}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans transition-all',
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
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop móvil */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-foreground/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r-2 border-border bg-background transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
          <a href="/" className="cursor-pointer">
            <Logo size={26} variant="full" wordmarkClassName="text-lg" />
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="cursor-pointer rounded-base p-1 text-foreground/60 hover:bg-secondary-background md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User */}
        <div className="border-b-2 border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3 py-2 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main font-heading text-sm text-main-foreground">
              {ready ? initial : '…'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-heading leading-tight">
                {ready ? roleName || '—' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => {
            const visible = section.items.filter(canSee);
            if (!visible.length) return null;
            return (
              <div key={section.group} className="space-y-1">
                <p className="px-3 pb-1 font-heading text-[10px] uppercase tracking-widest text-foreground/40">
                  {section.group}
                </p>
                {visible.map((item) => navLink(item.href, item.label, item.icon))}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t-2 border-border px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans text-foreground/70 transition-all hover:bg-secondary-background hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Área de contenido ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar móvil */}
        <div className="flex shrink-0 items-center gap-3 border-b-2 border-border bg-background px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="cursor-pointer rounded-base p-1 text-foreground hover:bg-secondary-background"
          >
            <Menu className="h-5 w-5" />
          </button>
          <a href="/" className="cursor-pointer">
            <Logo size={22} variant="full" />
          </a>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
