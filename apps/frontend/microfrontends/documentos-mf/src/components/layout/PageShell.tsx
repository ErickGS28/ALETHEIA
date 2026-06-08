'use client';

import type { ReactNode } from 'react';
import { ClockIcon, HistoryIcon, UploadIcon } from '../ui/icons';
import { TabsNav } from '../ui/tabs-nav';

const TABS = [
  { href: '/', label: 'Carga', icon: <UploadIcon className="h-4 w-4" /> },
  { href: '/versiones', label: 'Versiones', icon: <HistoryIcon className="h-4 w-4" /> },
  { href: '/vigencia', label: 'Vigencia', icon: <ClockIcon className="h-4 w-4" /> },
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-4xl font-heading">Documentos</h1>
          <p className="font-sans text-xs text-muted-foreground">
            Gestión documental del proveedor &middot; CLM ALETHEIA
          </p>
        </header>

        <TabsNav items={TABS} />

        {children}
      </div>
    </main>
  );
}
