'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
} from '@aletheia/frontend-commons';
import { useEffect, useMemo, useState } from 'react';
import { useAddVersionMutation, useListDocumentsQuery } from '../../../api/documentsApi';
import { ContractSelector } from '../../../components/ContractSelector';
import { FileIcon } from '../../../components/ui/icons';
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
  const toast = useToast();

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
      toast.success('Nueva versión subida', `Se agregó "${file.name}" como versión activa.`);
      return true;
    } catch (error) {
      toast.error(
        'No se pudo subir la versión',
        getApiErrorMessage(error, 'No se pudo subir la nueva versión.'),
      );
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
            <ErrorState
              message="No se pudieron cargar los contratos."
              onRetry={() => refetchContracts()}
            />
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

      {contractsError ? null : !ready ? (
        <Card>
          <CardContent className="pt-6">
            <LoadingState message="Cargando documentos…" />
          </CardContent>
        </Card>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<FileIcon className="h-5 w-5" />}
              title="Sin documentos cargados"
              description="Este contrato aún no tiene documentos cargados."
            />
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
