'use client';

import type { ReactNode } from 'react';
import { AppNav } from './AppNav';

interface PageShellProps {
  title: string;
  subtitle?: string;
  active: 'panel' | 'sla' | 'timeline';
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, active, actions, children }: PageShellProps) {
  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-4xl">{title}</h1>
            {subtitle ? (
              <p className="font-sans text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <AppNav active={active} />

        {children}
      </div>
    </main>
  );
}
