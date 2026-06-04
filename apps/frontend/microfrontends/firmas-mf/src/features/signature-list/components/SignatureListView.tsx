'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useRole,
} from '@aletheia/frontend-commons';
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
  } = useListContractsQuery({ status: 'SIGNING' });
  const {
    data: signed,
    isLoading: loadingSigned,
    isError: errorSigned,
  } = useListContractsQuery({ status: 'SIGNED' });

  const listToSign = toSign ?? [];
  const listSigned = signed ?? [];

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading">Firmas</h1>
            <p className="mt-1 font-sans text-xs text-foreground/50">
              {role ?? 'sin sesión'} &middot; {privileges.length} privilegios
            </p>
          </div>
          <a href="/">
            <Button variant="outline" size="sm">
              &larr; Inicio
            </Button>
          </a>
        </header>

        {/* Contratos por firmar */}
        <Card>
          <CardHeader>
            <CardTitle>Contratos por firmar</CardTitle>
            <CardDescription>Contratos en estado SIGNING pendientes de tu firma.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingToSign ? (
              <p className="font-sans text-sm text-foreground/50">Cargando…</p>
            ) : errorToSign ? (
              <Badge variant="destructive">No se pudieron cargar los contratos por firmar.</Badge>
            ) : listToSign.length === 0 ? (
              <p className="font-sans text-sm text-foreground/50">
                No hay contratos pendientes de firma.
              </p>
            ) : (
              <Table>
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
                      <TableCell className="text-foreground/60">{c.society?.name ?? '—'}</TableCell>
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
              <p className="font-sans text-sm text-foreground/50">Cargando…</p>
            ) : errorSigned ? (
              <Badge variant="destructive">No se pudieron cargar los contratos firmados.</Badge>
            ) : listSigned.length === 0 ? (
              <p className="font-sans text-sm text-foreground/50">Aún no hay firmas registradas.</p>
            ) : (
              <Table>
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
                      <TableCell className="text-foreground/60">{c.society?.name ?? '—'}</TableCell>
                      <TableCell className="text-foreground/60">
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
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
