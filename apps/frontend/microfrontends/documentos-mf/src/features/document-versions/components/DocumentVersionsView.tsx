'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aletheia/frontend-commons';
import { useEffect, useMemo, useState } from 'react';
import { useAddVersionMutation, useListDocumentsQuery } from '../../../api/documentsApi';
import { ContractSelector } from '../../../components/ContractSelector';
import { AlertIcon } from '../../../components/ui/icons';
import { adaptDocument } from '../../../lib/adapter';
import { getApiErrorMessage } from '../../../lib/error';
import { fileNameFromUrl } from '../../../lib/format';
import { useContractOptions } from '../../../lib/useContractOptions';
import { DocumentVersionsCard } from './DocumentVersionsCard';

export function DocumentVersionsView() {
  const {
    options,
    byId,
    isLoading: contractsLoading,
    isError: contractsError,
    refetch: refetchContracts,
  } = useContractOptions();
  const [contractId, setContractId] = useState<number | ''>('');
  const [versionError, setVersionError] = useState<string | null>(null);

  useEffect(() => {
    if (contractId === '' && options.length > 0) setContractId(options[0].id);
  }, [contractId, options]);

  const providerType =
    (contractId === '' ? undefined : byId.get(contractId))?.providerType ?? 'PERSONA_FISICA';

  const { data: docsRaw, isLoading: docsLoading } = useListDocumentsQuery(
    contractId === '' ? 0 : contractId,
    { skip: contractId === '' },
  );
  const [addVersion, { isLoading: adding }] = useAddVersionMutation();

  const docs = useMemo(
    () => (docsRaw ?? []).map((d) => adaptDocument(d, providerType)),
    [docsRaw, providerType],
  );

  const ready = !contractsLoading && !docsLoading && contractId !== '';

  /**
   * Adds a new version. Returns true on success so the card only clears its
   * input then; on failure we surface the error and keep the selected file.
   */
  async function handleAddVersion(documentId: number, file: File): Promise<boolean> {
    try {
      await addVersion({
        documentId,
        body: {
          fileUrl: `uploads/${fileNameFromUrl(file.name)}`,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        },
      }).unwrap();
      setVersionError(null);
      return true;
    } catch (error) {
      setVersionError(getApiErrorMessage(error, 'No se pudo subir la nueva versión.'));
      return false;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Versiones de documento</CardTitle>
          <CardDescription>
            Historial de versiones por documento. Subir una nueva versión incrementa la versión
            activa sin perder el histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contractsError ? (
            <div className="flex flex-col items-center gap-3 rounded-base border-2 border-dashed border-border bg-secondary-background/40 p-10 text-center font-sans text-sm text-foreground/60">
              <AlertIcon className="h-6 w-6 text-red-700" />
              <span>No se pudieron cargar los contratos.</span>
              <Button variant="neutral" size="sm" onClick={() => refetchContracts()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="max-w-md">
              <ContractSelector
                value={contractId}
                onChange={setContractId}
                options={options}
                disabled={contractsLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {versionError ? (
        <div className="flex items-start gap-3 rounded-base border-2 border-border bg-red-100 px-4 py-3 shadow-shadow">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <p className="flex-1 font-sans text-sm text-red-700">{versionError}</p>
        </div>
      ) : null}

      {contractsError ? null : !ready ? (
        <p className="font-sans text-sm text-foreground/50">Cargando documentos…</p>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center font-sans text-sm text-foreground/50">
            Este contrato aún no tiene documentos cargados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <DocumentVersionsCard
              key={doc.id}
              document={doc}
              disabled={adding}
              onAddVersion={(file) => handleAddVersion(doc.id, file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
