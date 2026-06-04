'use client';

import { Badge, useRole } from '@aletheia/frontend-commons';
import { ROLES } from '@aletheia/frontend-commons';

// Shared page header: title + current-role chip. Used across MF views.

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { role } = useRole();
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role ?? 'Sin sesión';

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="font-heading text-4xl leading-none">{title}</h1>
        {subtitle && <p className="font-sans text-sm text-foreground/60">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{roleLabel}</Badge>
        {actions}
      </div>
    </header>
  );
}
