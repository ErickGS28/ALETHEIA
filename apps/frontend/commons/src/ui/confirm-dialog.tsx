'use client';

import { Button } from './button';
import { Modal } from './modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Texto del cuerpo. Por defecto advierte que la acción es en servidor. */
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación reutilizable sobre el Modal canónico. */
export function ConfirmDialog({
  open,
  title,
  description,
  body,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="neutral" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm font-sans text-muted-foreground">
        {body ?? 'Esta acción se aplicará en el servidor y no se puede deshacer.'}
      </p>
    </Modal>
  );
}
