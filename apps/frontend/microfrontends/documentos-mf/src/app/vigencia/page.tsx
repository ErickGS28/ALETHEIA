import { PageShell } from '../../components/layout/PageShell';
import { ExpiryAlertsView } from '../../features/expiry-alerts/components/ExpiryAlertsView';

// /documentos/vigencia → control de vigencia (HU-10).
export default function Page() {
  return (
    <PageShell>
      <ExpiryAlertsView />
    </PageShell>
  );
}
