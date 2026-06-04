'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aletheia/frontend-commons';
import { useRouter } from 'next/navigation';
import {
  useGetContractQuery,
  useListApoderadosQuery,
  useListSignaturesQuery,
} from '../../signatures/api/signaturesApi';

interface SignatureDetailViewProps {
  contractId: string;
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
  } = useGetContractQuery(contractId);
  const {
    data: signatures,
    isLoading: loadingSignatures,
    isError: errorSignatures,
  } = useListSignaturesQuery(contractId);
  const { data: apoderados } = useListApoderadosQuery();

  const apoderadoById = (id?: number) =>
    id ? (apoderados ?? []).find((a) => a.id === id) : undefined;

  const loading = loadingContract || loadingSignatures;
  const list = signatures ?? [];

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-heading">Detalle de firma</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            &larr; Volver
          </Button>
        </header>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="font-sans text-sm text-foreground/50">Cargando…</p>
            </CardContent>
          </Card>
        ) : errorContract || !contract ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Badge variant="secondary">Contrato no encontrado</Badge>
              <div>
                <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
                  Ir a firmas
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : errorSignatures ? (
          <Card>
            <CardContent className="p-6">
              <Badge variant="destructive">No se pudieron cargar las firmas.</Badge>
            </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Badge variant="secondary">Este contrato aún no ha sido firmado</Badge>
              {contract.status === 'SIGNING' ? (
                <div>
                  <Button size="sm" onClick={() => router.push(`/firmar/${contract.id}`)}>
                    Firmar ahora
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{contract.folio}</CardTitle>
                <Badge variant="default">{contract.status}</Badge>
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
                        Firma · {sig.method}
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
