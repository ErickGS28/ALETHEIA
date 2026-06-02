'use client';

import { Button } from '@aletheia/frontend-commons';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  backHref = '/',
  backLabel = 'Inicio',
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="outline" size="sm">
            &larr; {backLabel}
          </Button>
        </Link>
        <h1 className="text-4xl font-heading">{title}</h1>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
