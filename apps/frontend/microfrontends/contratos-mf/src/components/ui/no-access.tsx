'use client';

import { Card, CardContent } from '@aletheia/frontend-commons';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from './page-header';

/** Pantalla de "sin permiso" reutilizable cuando falla el privilegio. */
export function NoAccess({ title = 'Plantillas' }: { title?: string }) {
  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title={title} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="h-10 w-10" />
            <p className="font-heading text-xl">Sin permiso</p>
            <p className="font-sans text-sm text-foreground/60">
              Necesitas el privilegio <strong>TEMPLATES_MANAGE</strong> para acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
