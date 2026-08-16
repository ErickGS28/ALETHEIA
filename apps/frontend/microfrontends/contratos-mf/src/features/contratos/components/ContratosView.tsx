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
  useRole,
} from '@aletheia/frontend-commons';
import { FileSignature, FileText, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';

export function ContratosView() {
  const { role, ready } = useRole();
  const canElaborate = role === 'ABOGADO';

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-4xl font-heading">Contratos</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Gestión de plantillas y elaboración de documentos
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <LayoutTemplate className="h-6 w-6" />
              <CardTitle className="text-xl">Plantillas</CardTitle>
              <CardDescription>Crea y administra plantillas de contrato (HU-18).</CardDescription>
            </CardHeader>
            <CardContent>
              <CookiePrivilegeGuard
                privilege="TEMPLATES_MANAGE"
                fallback={<Badge variant="secondary">Sin permiso (TEMPLATES_MANAGE)</Badge>}
              >
                <Link href="/plantillas">
                  <Button className="w-full">Gestionar plantillas</Button>
                </Link>
              </CookiePrivilegeGuard>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-6 w-6" />
              <CardTitle className="text-xl">Editor de plantilla</CardTitle>
              <CardDescription>Editor enriquecido WYSIWYG-lite (HU-18).</CardDescription>
            </CardHeader>
            <CardContent>
              <CookiePrivilegeGuard
                privilege="TEMPLATES_MANAGE"
                fallback={<Badge variant="secondary">Sin permiso (TEMPLATES_MANAGE)</Badge>}
              >
                <Link href="/plantillas/nueva">
                  <Button variant="neutral" className="w-full">
                    Nueva plantilla
                  </Button>
                </Link>
              </CookiePrivilegeGuard>
            </CardContent>
          </Card>

          {/* Solo el Abogado elabora el documento formal — se oculta para el resto de roles
              en vez de mostrarla y bloquearla después (ver ContractEditorView). */}
          {ready && canElaborate && (
            <Card>
              <CardHeader>
                <FileSignature className="h-6 w-6" />
                <CardTitle className="text-xl">Elaborar documento</CardTitle>
                <CardDescription>Genera el documento de un contrato (HU-19).</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/elaborar">
                  <Button variant="neutral" className="w-full">
                    Elaborar contrato
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
