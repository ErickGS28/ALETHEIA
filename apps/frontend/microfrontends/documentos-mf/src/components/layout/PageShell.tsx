'use client';

import { Badge, Button, useRole } from '@aletheia/frontend-commons';
import type { ReactNode } from 'react';
import { ArrowLeftIcon, CheckIcon, ClockIcon, HistoryIcon, UploadIcon } from '../ui/icons';
import { TabsNav } from '../ui/tabs-nav';

const TABS = [
  { href: '/', label: 'Carga', icon: <UploadIcon className="h-4 w-4" /> },
  { href: '/versiones', label: 'Versiones', icon: <HistoryIcon className="h-4 w-4" /> },
  { href: '/vigencia', label: 'Vigencia', icon: <ClockIcon className="h-4 w-4" /> },
];

/** Consistent header + role chip + tab navigation around each route. */
export function PageShell({ children }: { children: ReactNode }) {
  const { role, privileges } = useRole();

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-heading">Documentos</h1>
            <p className="font-sans text-xs text-foreground/50">
              Gestión documental del proveedor &middot; CLM ALETHEIA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 font-sans text-xs text-foreground/70">
              <span className="inline-flex items-center gap-1">
                <CheckIcon className="h-3.5 w-3.5" />
                {privileges.length} privilegios
              </span>
              <Badge variant="default">{role ?? 'sin sesión'}</Badge>
            </span>
            <a href="/">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4" />
                Inicio
              </Button>
            </a>
          </div>
        </header>

        <TabsNav items={TABS} />

        {children}
      </div>
    </main>
  );
}
