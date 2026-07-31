'use client';

import { NoPermission, PageHeader } from '@aletheia/frontend-commons';

/** Pantalla de "sin permiso" reutilizable cuando falla el privilegio. */
export function NoAccess({ title = 'Plantillas' }: { title?: string }) {
  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title={title} backToHome backLabel="Inicio" />
        <NoPermission message="Necesitas el privilegio TEMPLATES_MANAGE para acceder a esta sección." />
      </div>
    </main>
  );
}
