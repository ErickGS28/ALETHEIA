'use client';

import { NoPermission, PageHeader } from '@aletheia/frontend-commons';

/** Pantalla de "sin permiso" reutilizable cuando falla el privilegio o el rol requerido. */
export function NoAccess({
  title = 'Plantillas',
  message = 'Necesitas el privilegio TEMPLATES_MANAGE para acceder a esta sección.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title={title} backToHome backLabel="Inicio" />
        <NoPermission message={message} />
      </div>
    </main>
  );
}
