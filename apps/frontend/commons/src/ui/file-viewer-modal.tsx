'use client';

import * as React from 'react';
import { API_URL, fetchAuthenticatedBlob } from '../api/base-api';
import { Button } from './button';
import { Modal } from './modal';

export interface FileViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Relative URL from the gateway, e.g. "/files/<id>". */
  fileUrl: string;
  mimeType?: string;
  fileName?: string;
}

const INLINE_SAFE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

type ViewerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; objectUrl: string };

/**
 * Modal file viewer for genuinely uploaded documents (PDF/image/other) —
 * distinct from DocumentPreview, which renders the elaborated contract's
 * HTML body/header/footer, not a real file. Fetches the file as an
 * authenticated blob (the gateway only accepts a Bearer header) rather than
 * pointing <img>/<iframe> directly at fileUrl.
 */
export function FileViewerModal({
  open,
  onClose,
  title,
  fileUrl,
  mimeType,
  fileName,
}: FileViewerModalProps) {
  const [state, setState] = React.useState<ViewerState>({ status: 'loading' });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | undefined;
    setState({ status: 'loading' });

    (async () => {
      try {
        const blob = await fetchAuthenticatedBlob(`${API_URL}${fileUrl}`);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', objectUrl: createdUrl });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Error desconocido.',
        });
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, fileUrl]);

  const isInlineSafe = mimeType ? INLINE_SAFE_TYPES.has(mimeType) : false;
  const isImage = mimeType?.startsWith('image/') ?? false;

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-3xl">
      {state.status === 'loading' ? (
        <p className="font-sans text-xs text-muted-foreground">Cargando documento…</p>
      ) : state.status === 'error' ? (
        <p className="font-sans text-xs text-destructive">{state.message}</p>
      ) : isInlineSafe ? (
        isImage ? (
          <img
            src={state.objectUrl}
            alt={fileName ?? title}
            className="max-h-[70vh] w-full object-contain"
          />
        ) : (
          <iframe
            src={state.objectUrl}
            title={fileName ?? title}
            className="h-[70vh] w-full rounded-base border-2 border-border"
            // allow-scripts only: Chromium's built-in PDF viewer needs script
            // execution to render at all (an empty sandbox blocks it outright,
            // showing a broken-document icon instead of the PDF). Deliberately
            // omits allow-same-origin/allow-top-navigation/allow-forms/allow-popups
            // so embedded content still can't touch the real origin or navigate out.
            sandbox="allow-scripts"
          />
        )
      ) : (
        <div className="space-y-3">
          <p className="font-sans text-xs text-muted-foreground">
            Este tipo de archivo no se puede previsualizar.
          </p>
          <Button asChild>
            <a href={state.objectUrl} download={fileName}>
              Descargar {fileName ?? 'archivo'}
            </a>
          </Button>
        </div>
      )}
    </Modal>
  );
}
