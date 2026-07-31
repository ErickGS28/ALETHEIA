'use client';

import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  contractStatusLabel,
} from '@aletheia/frontend-commons';
import { PenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type SignatureMethod,
  useGetContractQuery,
  useListApoderadosQuery,
  useListSignaturesQuery,
} from '../../signatures/api/signaturesApi';

interface SignatureDetailViewProps {
  contractId: string;
}

const METHOD_LABELS: Record<SignatureMethod, string> = {
  CANVAS: 'Dibujada',
  ELECTRONIC: 'Electrónica',
};

function methodLabel(method: SignatureMethod): string {
  return METHOD_LABELS[method] ?? method;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export function SignatureDetailView({ contractId }: SignatureDetailViewProps) {
  const router = useRouter();

  const {
    data: contract,
    isLoading: loadingContract,
    isError: errorContract,
    refetch: refetchContract,
  } = useGetContractQuery(contractId);
  const {
    data: signatures,
    isLoading: loadingSignatures,
    isError: errorSignatures,
    refetch: refetchSignatures,
  } = useListSignaturesQuery(contractId);
  const { data: apoderados } = useListApoderadosQuery();

  const apoderadoById = (id?: number) =>
    id ? (apoderados ?? []).find((a) => a.id === id) : undefined;

  const loading = loadingContract || loadingSignatures;
  const list = signatures ?? [];

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-heading">Detalle de firma</h1>
          <BackButton crossZone label="Volver" />
        </header>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <LoadingState message="Cargando detalle de firma…" />
            </CardContent>
          </Card>
        ) : errorContract || !contract ? (
          <Card>
            <CardContent className="p-6">
              <ErrorState
                message="No se pudo cargar el contrato. Verifica tu conexión e intenta de nuevo."
                onRetry={refetchContract}
              />
              <div className="mt-4 flex justify-center">
                <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
                  Ir a firmas
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : errorSignatures ? (
          <Card>
            <CardContent className="p-6">
              <ErrorState
                message="No se pudieron cargar las firmas de este contrato."
                onRetry={refetchSignatures}
              />
            </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={<PenLine className="h-5 w-5" />}
                title="Este contrato aún no ha sido firmado"
                description={
                  contract.status === 'SIGNING'
                    ? 'El contrato está disponible para firma. Captura la firma para registrarla.'
                    : 'Cuando se registre una firma aparecerá aquí con sus metadatos.'
                }
                action={
                  contract.status === 'SIGNING' ? (
                    <Button size="sm" onClick={() => router.push(`/firmar/${contract.id}`)}>
                      Firmar ahora
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{contract.folio}</CardTitle>
                <StatusBadge status={contract.status} />
              </div>
              <CardDescription>
                {contract.vendorName} &middot; {contract.society?.name ?? '—'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {list.map((sig) => {
                const attorney = apoderadoById(sig.apoderadoId);
                return (
                  <div key={sig.id} className="space-y-6">
                    {/* Imagen de la firma (base64) */}
                    <div className="space-y-2">
                      <span className="text-xs font-heading uppercase tracking-widest text-foreground/70">
                        Firma · {methodLabel(sig.method)}
                      </span>
                      <div className="rounded-base border-2 border-border bg-background p-4 shadow-shadow">
                        <img
                          src={sig.signatureData}
                          alt={`Firma del contrato ${contract.folio}`}
                          className="mx-auto block max-h-56 w-auto"
                        />
                      </div>
                    </div>

                    {/* Metadatos de la firma */}
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <dt className="text-xs font-heading uppercase tracking-widest text-foreground/70">
                          Apoderado
                        </dt>
                        <dd className="font-sans text-sm">{attorney?.name ?? '—'}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs font-heading uppercase tracking-widest text-foreground/70">
                          Poder legal
                        </dt>
                        <dd className="font-sans text-sm text-foreground/70">
                          {attorney?.legalPower ?? '—'}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs font-heading uppercase tracking-widest text-foreground/70">
                          Firmado por (id)
                        </dt>
                        <dd className="font-sans text-sm">{sig.signedById}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs font-heading uppercase tracking-widest text-foreground/70">
                          Fecha
                        </dt>
                        <dd className="font-sans text-sm">{formatDate(sig.signedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
