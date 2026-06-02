'use client';

import { Button, Card, CardContent } from '@aletheia/frontend-commons';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

/** Estado "sin permiso" para una sección gateada por privilegio. */
export function NoPermission({ message }: { message?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-base border-2 border-border bg-secondary-background shadow-shadow">
          <Lock className="h-6 w-6" />
        </div>
        <p className="text-xl font-heading">Sin permiso</p>
        <p className="max-w-sm text-sm font-mono text-foreground/60">
          {message ?? 'Tu rol actual no tiene el privilegio necesario para acceder a esta sección.'}
        </p>
      </CardContent>
    </Card>
  );
}

/** Estado vacío genérico para tablas/listas. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
          {icon}
        </div>
      ) : null}
      <p className="text-lg font-heading">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm font-mono text-foreground/60">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

/** Estado de carga genérico para tablas/listas. */
export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
      <p className="text-sm font-mono text-foreground/60">{message ?? 'Cargando…'}</p>
    </div>
  );
}

/** Estado de error con reintento. */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="text-lg font-heading">No se pudo cargar</p>
      <p className="max-w-sm text-sm font-mono text-foreground/60">
        {message ?? 'Ocurrió un error al consultar el servidor.'}
      </p>
      {onRetry ? (
        <Button variant="neutral" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
