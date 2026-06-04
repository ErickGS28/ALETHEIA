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
  const { role, privileges } = useRole();

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-heading">Contratos</h1>
          <a href="/">
            <Button variant="outline" size="sm">
              &larr; Inicio
            </Button>
          </a>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Microfrontend · Contratos (CLM)</CardTitle>
            <CardDescription>Gestión de plantillas y elaboración de documentos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 font-sans text-sm text-foreground/70">
            <span>Rol actual:</span>
            <Badge variant="default">{role ?? 'sin sesión'}</Badge>
            <span className="text-foreground/40">· {privileges.length} privilegios activos</span>
          </CardContent>
        </Card>

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
        </div>
      </div>
    </main>
  );
}
