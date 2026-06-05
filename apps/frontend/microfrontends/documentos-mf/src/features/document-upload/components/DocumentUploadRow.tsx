'use client';

import { Badge, Button, Input } from '@aletheia/frontend-commons';
import { useRef, useState } from 'react';
import { CheckIcon, FileIcon, UploadIcon } from '../../../components/ui/icons';
import { validateDocumentFile } from '../../../lib/fileValidation';
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

/** Inline feedback for the picker: validation error (token) or selected-file badge. */
function FileSelectionFeedback({
  errorId,
  fileError,
  pendingFile,
}: {
  errorId: string;
  fileError: string | null;
  pendingFile: File | null;
}) {
  if (fileError) {
    return (
      <p id={errorId} className="mt-2 font-sans text-xs text-destructive">
        {fileError}
      </p>
    );
  }
  if (pendingFile) {
    return (
      <div className="mt-2">
        <Badge variant="secondary" className="gap-1.5 font-normal">
          <FileIcon className="h-3.5 w-3.5" />
          {pendingFile.name} &middot; {formatBytes(pendingFile.size)}
        </Badge>
      </div>
    );
  }
  return null;
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
  const [fileError, setFileError] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');

  const isUploaded = Boolean(document);
  const active = document?.versions[document.versions.length - 1];

  function handleSelect(file: File | null) {
    if (!file) {
      setPendingFile(null);
      setFileError(null);
      return;
    }
    const error = validateDocumentFile(file);
    setFileError(error);
    setPendingFile(error ? null : file);
  }

  async function handleConfirm() {
    if (!pendingFile) return;
    const result = await onUpload(
      pendingFile,
      requirement.tracksExpiry && expiryDate ? expiryDate : undefined,
    );
    // Keep the selected file when the upload failed so the user can retry.
    if (result === false) return;
    setPendingFile(null);
    setFileError(null);
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
            <div className="font-sans text-xs text-muted-foreground">
              {requirement.tracksExpiry
                ? 'Acepta fecha de vigencia (opcional)'
                : 'Sin fecha de vigencia'}
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
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-base border-2 border-border bg-secondary-background/40 p-3 font-sans text-xs text-foreground/70 sm:grid-cols-4">
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
              className="font-sans text-xs uppercase tracking-wide text-muted-foreground"
            >
              Archivo
            </label>
            <Input
              id={`file-${requirement.key}`}
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? `file-error-${requirement.key}` : undefined}
              onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
            />
          </div>

          {requirement.tracksExpiry ? (
            <div className="space-y-1.5 sm:w-44">
              <label
                htmlFor={`exp-${requirement.key}`}
                className="flex items-center gap-1 font-sans text-xs uppercase tracking-wide text-muted-foreground"
              >
                Vigencia
                <span className="font-sans text-[10px] normal-case tracking-normal text-foreground/50">
                  (opcional)
                </span>
              </label>
              <Input
                id={`exp-${requirement.key}`}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          ) : null}

          <Button
            onClick={handleConfirm}
            disabled={!pendingFile || disabled}
            aria-label={`Cargar ${requirement.label}`}
          >
            <UploadIcon className="h-4 w-4" />
            Cargar
          </Button>
        </div>
      )}

      {isUploaded ? null : (
        <FileSelectionFeedback
          errorId={`file-error-${requirement.key}`}
          fileError={fileError}
          pendingFile={pendingFile}
        />
      )}
    </div>
  );
}
