import { PageShell } from '../components/layout/PageShell';
import { DocumentUploadView } from '../features/document-upload/components/DocumentUploadView';

// Ruta raíz del MF (basePath /documentos) → carga de documentos requeridos (HU-08).
export default function Page() {
  return (
    <PageShell>
      <DocumentUploadView />
    </PageShell>
  );
}
