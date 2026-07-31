import { LoadingState } from '@aletheia/frontend-commons';
import { Suspense } from 'react';
import { CreateContractView } from '../../features/create-contract/components/CreateContractView';

// useSearchParams() (edit mode) requires a Suspense boundary in Next 15.
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="bg-grid min-h-screen p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">
            <LoadingState message="Cargando formulario…" />
          </div>
        </main>
      }
    >
      <CreateContractView />
    </Suspense>
  );
}
