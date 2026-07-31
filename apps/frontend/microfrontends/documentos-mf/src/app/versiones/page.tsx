import { PageShell } from '../../components/layout/PageShell';
import { DocumentVersionsView } from '../../features/document-versions/components/DocumentVersionsView';

// /documentos/versiones → versiones de documento (HU-09).
export default function Page() {
  return (
    <PageShell>
      <DocumentVersionsView />
    </PageShell>
  );
}
