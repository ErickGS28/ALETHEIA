import { Suspense } from 'react';
import { CreateContractView } from '../../features/create-contract/components/CreateContractView';

// useSearchParams() (edit mode) requires a Suspense boundary in Next 15.
export default function Page() {
  return (
    <Suspense
      fallback={<div className="bg-grid min-h-screen p-6 font-sans text-sm">Cargando…</div>}
    >
      <CreateContractView />
    </Suspense>
  );
}
