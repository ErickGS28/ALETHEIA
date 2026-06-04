'use client';

import { cn } from '@aletheia/frontend-commons';
import { usePathname } from 'next/navigation';
import * as React from 'react';

/* ─── Icons ─────────────────────────────────────────────────────────── */
const IconHome = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconFile = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconContract = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);
const IconFolder = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const IconFlow = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
);
const IconPen = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);
const IconChart = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);
const IconSettings = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconLogOut = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ─── Nav data ───────────────────────────────────────────────────────── */
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  requires: string[];
};

const SECTIONS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Módulos',
    items: [
      {
        href: '/solicitudes',
        label: 'Solicitudes',
        icon: <IconFile />,
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
        icon: <IconContract />,
        requires: ['TEMPLATES_MANAGE'],
      },
      {
        href: '/documentos',
        label: 'Documentos',
        icon: <IconFolder />,
        requires: ['DOCUMENT_UPLOAD', 'DOCUMENT_VERSION'],
      },
      {
        href: '/flujo',
        label: 'Flujo de trabajo',
        icon: <IconFlow />,
        requires: ['CONTRACT_REVIEW_ADMIN', 'CONTRACT_REVIEW_LAWYER', 'CONTRACT_APPROVE'],
      },
      { href: '/firmas', label: 'Firmas', icon: <IconPen />, requires: ['CONTRACT_SIGN'] },
    ],
  },
  {
    group: 'Analítica',
    items: [
      { href: '/reportes', label: 'Reportes', icon: <IconChart />, requires: ['REPORTS_VIEW'] },
    ],
  },
  {
    group: 'Sistema',
    items: [
      {
        href: '/admin',
        label: 'Administración',
        icon: <IconSettings />,
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
}

export function AppSidebar({ role, email, roleName, privileges, onLogout }: AppSidebarProps) {
  const pathname = usePathname();

  const canSee = (item: NavItem) =>
    item.requires.length === 0 || item.requires.some((p) => privileges.includes(p));

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const initial = (roleName || role || 'U').charAt(0).toUpperCase();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r-2 border-border bg-background">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b-2 border-border px-5 py-4">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-base border-2 border-border font-heading text-sm"
          style={{ background: '#15a8b5', color: '#fff' }}
        >
          A
        </div>
        <span className="font-heading text-lg leading-none tracking-tight">ALETHEIA</span>
      </div>

      {/* User */}
      <div className="border-b-2 border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-3 py-2 shadow-[2px_2px_0_0_var(--color-shadow)]">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-base border-2 border-border font-heading text-sm"
            style={{ background: '#15a8b5', color: '#fff' }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-heading leading-tight">{roleName || role}</p>
            <p className="truncate text-xs text-foreground/50 leading-tight">
              {email || 'Sesión activa'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Dashboard — always visible */}
        <a
          href="/"
          className={cn(
            'flex items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans transition-all',
            isActive('/')
              ? 'border-2 border-border bg-main text-background shadow-[2px_2px_0_0_var(--color-shadow)]'
              : 'text-foreground/65 hover:bg-secondary-background hover:text-foreground',
          )}
        >
          <span className="shrink-0">
            <IconHome />
          </span>
          <span>Panel de control</span>
        </a>

        {SECTIONS.map((section) => {
          const visible = section.items.filter(canSee);
          if (!visible.length) return null;
          return (
            <div key={section.group}>
              <p className="mb-1.5 px-3 text-xs font-heading uppercase tracking-[0.14em] text-foreground/35">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans transition-all',
                        isActive(item.href)
                          ? 'border-2 border-border bg-main text-background shadow-[2px_2px_0_0_var(--color-shadow)]'
                          : 'text-foreground/65 hover:bg-secondary-background hover:text-foreground',
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="leading-tight">{item.label}</span>
                    </a>
                  </li>
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
          className="flex w-full items-center gap-3 rounded-base px-3 py-2.5 text-sm font-sans text-foreground/55 transition-all hover:bg-secondary-background hover:text-foreground"
        >
          <IconLogOut />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
