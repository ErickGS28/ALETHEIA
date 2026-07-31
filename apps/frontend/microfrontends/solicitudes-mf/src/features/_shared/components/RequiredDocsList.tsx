'use client';

import { FileText } from 'lucide-react';
import { useRequiredDocsQuery } from '../api/contracts-api';
import { toBackendProviderType } from '../api/types';
import { PROVIDER_TYPE_LABEL, type ProviderType } from '../domain/contract';

// Informational list of required documents per provider type (this MF does not
// handle uploads — that lives in documentos-mf). The list is served by the
// backend: GET /documents/required?providerType=FISICA|MORAL.

export function RequiredDocsList({ providerType }: { providerType: ProviderType }) {
  const { data, isLoading, isError } = useRequiredDocsQuery(toBackendProviderType(providerType));

  return (
    <div className="space-y-2">
      <p className="font-sans text-xs text-muted-foreground">
        Documentos requeridos para {PROVIDER_TYPE_LABEL[providerType]}:
      </p>

      {isLoading ? (
        <p className="font-sans text-xs text-muted-foreground">Cargando documentos…</p>
      ) : isError ? (
        <p className="font-sans text-xs text-destructive">
          No se pudo cargar la lista de documentos.
        </p>
      ) : !data || data.length === 0 ? (
        <p className="font-sans text-xs text-muted-foreground">Sin documentos requeridos.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.map((doc) => (
            <li
              key={doc.type}
              className="flex items-center gap-2 rounded-base border-2 border-border bg-secondary-background px-3 py-2 font-sans text-xs"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              {doc.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
