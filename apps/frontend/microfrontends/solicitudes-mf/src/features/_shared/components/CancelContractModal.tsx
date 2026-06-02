'use client';

import { Button } from '@aletheia/frontend-commons';
import * as React from 'react';
import { Field } from '../../../components/ui/field';
import { Modal } from '../../../components/ui/modal';
import { Textarea } from '../../../components/ui/textarea';
import type { Contract } from '../domain/contract';

// Reusable cancel-with-reason modal. Confirm is disabled until a reason exists.

interface CancelContractModalProps {
  contract: Contract | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelContractModal({ contract, onClose, onConfirm }: CancelContractModalProps) {
  const [reason, setReason] = React.useState('');

  // Reset the textarea whenever the targeted contract changes.
  React.useEffect(() => {
    setReason('');
  }, [contract?.id]);

  const trimmed = reason.trim();

  return (
    <Modal
      open={contract !== null}
      onClose={onClose}
      title="Cancelar solicitud"
      description={contract ? `${contract.folio} · ${contract.title}` : undefined}
      footer={
        <>
          <Button variant="neutral" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={trimmed.length === 0}
            onClick={() => {
              onConfirm(trimmed);
              setReason('');
            }}
          >
            Cancelar solicitud
          </Button>
        </>
      }
    >
      <Field label="Motivo de cancelación" htmlFor="cancel-reason" required>
        <Textarea
          id="cancel-reason"
          placeholder="Describe el motivo de la cancelación…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
