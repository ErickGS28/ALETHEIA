import { LoadingState } from '@aletheia/frontend-commons';
import { Suspense } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DocumentUploadView } from '../features/document-upload/components/DocumentUploadView';

// Ruta raíz del MF (basePath /documentos) → carga de documentos requeridos (HU-08).
// useSearchParams() (dentro de DocumentUploadView) requiere un límite de Suspense en Next 15.
export default function Page() {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState message="Cargando documentos…" />}>
        <DocumentUploadView />
      </Suspense>
    </PageShell>
  );
}
