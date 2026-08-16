'use client';

import { useRole } from '@aletheia/frontend-commons';
import type { ReactNode } from 'react';
import { ClockIcon, HistoryIcon, UploadIcon } from '../ui/icons';
import { type TabItem, TabsNav } from '../ui/tabs-nav';

const TABS: (TabItem & { requiresPrivilege?: 'DOCUMENT_UPLOAD' })[] = [
  {
    href: '/',
    label: 'Carga',
    icon: <UploadIcon className="h-4 w-4" />,
    requiresPrivilege: 'DOCUMENT_UPLOAD',
  },
  { href: '/versiones', label: 'Versiones', icon: <HistoryIcon className="h-4 w-4" /> },
  { href: '/vigencia', label: 'Vigencia', icon: <ClockIcon className="h-4 w-4" /> },
];

export function PageShell({ children }: { children: ReactNode }) {
  const { can, ready } = useRole();
  // Oculta "Carga" para roles sin DOCUMENT_UPLOAD (p.ej. Administrador) en vez de
  // mostrarla y bloquear el contenido después (ver DocumentUploadView).
  const tabs = TABS.filter((t) => !t.requiresPrivilege || !ready || can(t.requiresPrivilege));

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-4xl font-heading">Documentos</h1>
          <p className="font-sans text-xs text-muted-foreground">
            Gestión documental del proveedor &middot; CLM ALETHEIA
          </p>
        </header>

        <TabsNav items={tabs} />

        {children}
      </div>
    </main>
  );
}
