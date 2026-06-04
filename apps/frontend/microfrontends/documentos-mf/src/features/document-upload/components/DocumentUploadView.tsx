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
} from '@aletheia/frontend-commons';
import { useEffect, useMemo, useState } from 'react';
import {
  useListDocumentsQuery,
  useRequiredDocsQuery,
  useUploadDocumentMutation,
} from '../../../api/documentsApi';
import { ContractSelector } from '../../../components/ContractSelector';
import { AlertIcon } from '../../../components/ui/icons';
import {
  PROVIDER_TYPE_LABELS,
  adaptDocument,
  adaptRequiredDoc,
  toBackendProviderType,
} from '../../../lib/adapter';
import { getApiErrorMessage } from '../../../lib/error';
import { fileNameFromUrl } from '../../../lib/format';
import { useContractOptions } from '../../../lib/useContractOptions';
import { DocumentUploadRow } from './DocumentUploadRow';

export function DocumentUploadView() {
  const {
    options,
    byId,
    isLoading: contractsLoading,
    isError: contractsError,
    refetch: refetchContracts,
  } = useContractOptions();
  const [contractId, setContractId] = useState<number | ''>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Default to the first contract once loaded.
  useEffect(() => {
    if (contractId === '' && options.length > 0) setContractId(options[0].id);
  }, [contractId, options]);

  const selected = contractId === '' ? undefined : byId.get(contractId);
  const providerType = selected?.providerType ?? 'PERSONA_FISICA';
  const backendProviderType = toBackendProviderType(providerType);

  // Skip required-docs until the contract is resolved, so we never fetch the
  // FISICA defaults while the real contract may be MORAL.
  const { data: requiredRaw, isLoading: reqLoading } = useRequiredDocsQuery(backendProviderType, {
    skip: contractId === '' || !selected,
  });
  const { data: docsRaw, isLoading: docsLoading } = useListDocumentsQuery(
    contractId === '' ? 0 : contractId,
    { skip: contractId === '' },
  );
  const [uploadDocument, { isLoading: uploading }] = useUploadDocumentMutation();

  const requirements = useMemo(() => (requiredRaw ?? []).map(adaptRequiredDoc), [requiredRaw]);

  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of requiredRaw ?? []) map[r.type] = r.label;
    return map;
  }, [requiredRaw]);

  const contractDocs = useMemo(
    () => (docsRaw ?? []).map((d) => adaptDocument(d, providerType, labels)),
    [docsRaw, providerType, labels],
  );

  const uploadedCount = requirements.filter((r) =>
    contractDocs.some((d) => d.key === r.key),
  ).length;
  const total = requirements.length;

  const ready = !contractsLoading && !reqLoading && !docsLoading && contractId !== '';

  /**
   * Uploads a document. Returns true on success so the row only clears its
   * input when the upload actually succeeded; on failure we surface the error
   * and keep the selected file intact.
   */
  async function handleUpload(
    type: string,
    file: File,
    expiryDate?: string,
    isRequired = true,
  ): Promise<boolean> {
    if (contractId === '') return false;
    try {
      await uploadDocument({
        contractId,
        body: {
          name: file.name,
          type,
          // No binary upload: fileUrl carries a URL/string derived from the file name.
          fileUrl: `uploads/${fileNameFromUrl(file.name)}`,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          isRequired,
          expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        },
      }).unwrap();
      setUploadError(null);
      return true;
    } catch (error) {
      setUploadError(getApiErrorMessage(error, 'No se pudo cargar el documento.'));
      return false;
    }
  }

  return (
    <CookiePrivilegeGuard
      privilege="DOCUMENT_UPLOAD"
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Carga de documentos</CardTitle>
            <CardDescription>
              Necesitas el privilegio DOCUMENT_UPLOAD para cargar documentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Sin permiso para esta sección</Badge>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carga de documentos requeridos</CardTitle>
            <CardDescription>
              Selecciona el contrato; los documentos requeridos se obtienen según el tipo de
              proveedor del contrato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractsError ? (
              <div className="flex flex-col items-center gap-3 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
                <AlertIcon className="h-6 w-6 text-red-700" />
                <span>No se pudieron cargar los contratos.</span>
                <Button variant="neutral" size="sm" onClick={() => refetchContracts()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ContractSelector
                    value={contractId}
                    onChange={setContractId}
                    options={options}
                    disabled={contractsLoading}
                  />
                  <div className="space-y-1.5">
                    <div className="font-sans text-xs uppercase tracking-wide text-foreground/60">
                      Tipo de proveedor
                    </div>
                    <div className="flex h-10 items-center rounded-base border-2 border-border bg-secondary-background/40 px-3 font-sans text-sm">
                      {PROVIDER_TYPE_LABELS[providerType]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-base border-2 border-border bg-secondary-background/40 px-4 py-3">
                  <span className="font-sans text-xs text-foreground/70">
                    Progreso de carga &middot; {PROVIDER_TYPE_LABELS[providerType]}
                  </span>
                  <Badge variant={total > 0 && uploadedCount === total ? 'default' : 'secondary'}>
                    {uploadedCount} / {total} documentos
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {uploadError ? (
          <div className="flex items-start gap-3 rounded-base border-2 border-border bg-red-100 px-4 py-3 shadow-shadow">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p className="flex-1 font-sans text-sm text-red-700">{uploadError}</p>
          </div>
        ) : null}

        {contractsError ? null : !ready ? (
          <p className="font-sans text-sm text-foreground/50">Cargando documentos…</p>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => {
              const doc = contractDocs.find((d) => d.key === req.key);
              return (
                <DocumentUploadRow
                  key={req.key}
                  requirement={req}
                  document={doc}
                  disabled={uploading}
                  onUpload={(file, expiryDate) => handleUpload(req.key, file, expiryDate)}
                />
              );
            })}
          </div>
        )}
      </div>
    </CookiePrivilegeGuard>
  );
}
