'use client';

import { Badge, Button, useRole } from '@aletheia/frontend-commons';
import type { ReactNode } from 'react';
import { AppNav } from './AppNav';

interface PageShellProps {
  title: string;
  subtitle?: string;
  /** Active nav key for highlighting. */
  active: 'panel' | 'sla' | 'timeline';
  /** Optional top-right action (e.g. reset demo). */
  actions?: ReactNode;
  children: ReactNode;
}

/** Shared layout for every flujo-mf page: grid background, header, nav. */
export function PageShell({ title, subtitle, active, actions, children }: PageShellProps) {
  const { role } = useRole();

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-4xl">{title}</h1>
            {subtitle ? <p className="font-sans text-sm text-foreground/60">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 font-sans text-xs text-foreground/60">
              <span>Rol:</span>
              <Badge variant="default">{role ?? 'sin sesión'}</Badge>
            </div>
            {actions}
            <a href="/">
              <Button variant="outline" size="sm">
                &larr; Inicio
              </Button>
            </a>
          </div>
        </header>

        <AppNav active={active} />

        {children}
      </div>
    </main>
  );
}
