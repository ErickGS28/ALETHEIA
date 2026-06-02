'use client';

import { Badge, Button, Input } from '@aletheia/frontend-commons';
import { useRef, useState } from 'react';
import { CheckIcon, FileIcon, UploadIcon } from '../../../components/ui/icons';
import { formatBytes, formatDate, formatMimeType } from '../../../lib/format';
import type { DocumentRecord, RequiredDocument } from '../../../lib/types';

interface DocumentUploadRowProps {
  requirement: RequiredDocument;
  /** Existing document for this slot, if already uploaded. */
  document?: DocumentRecord;
  /** Resolves to true when the upload succeeded; we only clear the input then. */
  onUpload: (file: File, expiryDate?: string) => undefined | boolean | Promise<undefined | boolean>;
  disabled?: boolean;
}

/** A single required-document slot: pendiente / cargado + file picker. */
export function DocumentUploadRow({
  requirement,
  document,
  onUpload,
  disabled = false,
}: DocumentUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');

  const isUploaded = Boolean(document);
  const active = document?.versions[document.versions.length - 1];

  async function handleConfirm() {
    if (!pendingFile) return;
    const result = await onUpload(
      pendingFile,
      requirement.tracksExpiry && expiryDate ? expiryDate : undefined,
    );
    // Keep the selected file when the upload failed so the user can retry.
    if (result === false) return;
    setPendingFile(null);
    setExpiryDate('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="rounded-base border-2 border-border bg-background p-4 shadow-shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-border bg-secondary-background">
            <FileIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="font-heading text-base">{requirement.label}</div>
            <div className="font-mono text-xs text-foreground/50">
              {requirement.tracksExpiry ? 'Requiere fecha de vigencia' : 'Sin vigencia'}
            </div>
          </div>
        </div>

        {isUploaded ? (
          <Badge variant="default" className="gap-1">
            <CheckIcon className="h-3.5 w-3.5" />
            Cargado
          </Badge>
        ) : (
          <Badge variant="secondary">Pendiente</Badge>
        )}
      </div>

      {isUploaded && active ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-base border-2 border-border bg-secondary-background/40 p-3 font-mono text-xs text-foreground/70 sm:grid-cols-4">
          <span className="truncate" title={active.fileName}>
            {active.fileName}
          </span>
          <span>{formatBytes(active.size)}</span>
          <span>{formatMimeType(active.mimeType)}</span>
          <span>v{document.currentVersion}</span>
          {document.expiryDate ? (
            <span className="col-span-2 sm:col-span-4">
              Vigencia: {formatDate(document.expiryDate)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor={`file-${requirement.key}`}
              className="font-mono text-xs uppercase tracking-wide text-foreground/60"
            >
              Archivo
            </label>
            <Input
              id={`file-${requirement.key}`}
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {requirement.tracksExpiry ? (
            <div className="space-y-1.5 sm:w-44">
              <label
                htmlFor={`exp-${requirement.key}`}
                className="font-mono text-xs uppercase tracking-wide text-foreground/60"
              >
                Vigencia (opcional)
              </label>
              <Input
                id={`exp-${requirement.key}`}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          ) : null}

          <Button onClick={handleConfirm} disabled={!pendingFile || disabled}>
            <UploadIcon className="h-4 w-4" />
            Cargar
          </Button>
        </div>
      )}

      {pendingFile && !isUploaded ? (
        <div className="mt-2 font-mono text-xs text-foreground/50">
          Seleccionado: {pendingFile.name} &middot; {formatBytes(pendingFile.size)}
        </div>
      ) : null}
    </div>
  );
}
