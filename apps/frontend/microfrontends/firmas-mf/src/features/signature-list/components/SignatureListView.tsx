'use client';

import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useRole,
} from '@aletheia/frontend-commons';
import { FileSignature, PenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useListContractsQuery } from '../../signatures/api/signaturesApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SignatureListView() {
  const router = useRouter();
  const { role, privileges } = useRole();

  const {
    data: toSign,
    isLoading: loadingToSign,
    isError: errorToSign,
    refetch: refetchToSign,
  } = useListContractsQuery({ status: 'SIGNING' });
  const {
    data: signed,
    isLoading: loadingSigned,
    isError: errorSigned,
    refetch: refetchSigned,
  } = useListContractsQuery({ status: 'SIGNED' });

  const listToSign = toSign ?? [];
  const listSigned = signed ?? [];

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading">Firmas</h1>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {role ?? 'sin sesión'} &middot; {privileges.length} privilegios
            </p>
          </div>
          <BackButton crossZone label="Inicio" />
        </header>

        {/* Contratos por firmar */}
        <Card>
          <CardHeader>
            <CardTitle>Contratos por firmar</CardTitle>
            <CardDescription>Contratos en estado SIGNING pendientes de tu firma.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingToSign ? (
              <LoadingState message="Cargando contratos por firmar…" />
            ) : errorToSign ? (
              <ErrorState
                message="No se pudieron cargar los contratos por firmar."
                onRetry={refetchToSign}
              />
            ) : listToSign.length === 0 ? (
              <EmptyState
                icon={<PenLine className="h-5 w-5" />}
                title="No hay contratos pendientes de firma"
                description="Cuando un contrato pase a estado En firma aparecerá aquí."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Sociedad</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listToSign.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-heading">{c.folio}</TableCell>
                        <TableCell>{c.vendorName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.society?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <CookiePrivilegeGuard
                            privilege="CONTRACT_SIGN"
                            fallback={<Badge variant="secondary">Sin permiso</Badge>}
                          >
                            <Button size="sm" onClick={() => router.push(`/firmar/${c.id}`)}>
                              Firmar
                            </Button>
                          </CookiePrivilegeGuard>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos firmados */}
        <Card>
          <CardHeader>
            <CardTitle>Contratos firmados</CardTitle>
            <CardDescription>Historial de contratos en estado SIGNED.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSigned ? (
              <LoadingState message="Cargando contratos firmados…" />
            ) : errorSigned ? (
              <ErrorState
                message="No se pudieron cargar los contratos firmados."
                onRetry={refetchSigned}
              />
            ) : listSigned.length === 0 ? (
              <EmptyState
                icon={<FileSignature className="h-5 w-5" />}
                title="Aún no hay firmas registradas"
                description="El historial de contratos firmados aparecerá aquí."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Sociedad</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listSigned.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-heading">{c.folio}</TableCell>
                        <TableCell>{c.vendorName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.society?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(c.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="neutral"
                            size="sm"
                            onClick={() => router.push(`/detalle/${c.id}`)}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
