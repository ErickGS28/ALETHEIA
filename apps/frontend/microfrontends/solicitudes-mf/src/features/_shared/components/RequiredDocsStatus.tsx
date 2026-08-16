'use client';

import { Badge, Button } from '@aletheia/frontend-commons';
import { FileText, FolderOpen } from 'lucide-react';
import { useListDocumentsQuery, useRequiredDocsQuery } from '../api/contracts-api';
import { toBackendProviderType } from '../api/types';
import { PROVIDER_TYPE_LABEL, type ProviderType } from '../domain/contract';

/**
 * Cruza los documentos requeridos por tipo de proveedor con los que ya existen
 * para este contrato (GET /documents/:contractId, sin restricción de
 * privilegio) para mostrar cargado/pendiente sin exponer el archivo en sí —
 * ver/subir el archivo vive en documentos-mf, a donde enlaza el botón.
 */
export function RequiredDocsStatus({
  contractId,
  providerType,
}: {
  contractId: number;
  providerType: ProviderType;
}) {
  const { data: required, isLoading: reqLoading } = useRequiredDocsQuery(
    toBackendProviderType(providerType),
  );
  const { data: docs, isLoading: docsLoading } = useListDocumentsQuery(contractId);

  const uploadedTypes = new Set((docs ?? []).map((d) => d.type));
  const total = required?.length ?? 0;
  const uploadedCount = (required ?? []).filter((r) => uploadedTypes.has(r.type)).length;
  const loading = reqLoading || docsLoading;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-xs text-muted-foreground">
          Documentos requeridos para {PROVIDER_TYPE_LABEL[providerType]}
        </p>
        {!loading && (
          <Badge variant={total > 0 && uploadedCount === total ? 'default' : 'secondary'}>
            {uploadedCount} / {total} cargados
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="font-sans text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {(required ?? []).map((doc) => {
            const uploaded = uploadedTypes.has(doc.type);
            return (
              <li
                key={doc.type}
                className="flex items-center justify-between gap-2 rounded-base border-2 border-border bg-secondary-background px-3 py-2 font-sans text-xs"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {doc.label}
                </span>
                <Badge variant={uploaded ? 'default' : 'secondary'}>
                  {uploaded ? 'Cargado' : 'Pendiente'}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <Button asChild variant="neutral" size="sm">
        <a href={`/documentos?contractId=${contractId}`}>
          <FolderOpen className="h-4 w-4" />
          Ir a documentos
        </a>
      </Button>
    </div>
  );
}
