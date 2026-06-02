'use client';

import { Badge, Button } from '@aletheia/frontend-commons';
import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/modal';
import { Textarea } from '../../../components/ui/textarea';
import type { WorkflowContract } from '../../_shared/adapters';
import { STATUS_LABELS, approveLabel, nextStatusOnApprove } from '../../_shared/workflow-rules';

export type ReviewActionKind = 'approve' | 'return' | 'reject';

interface ReviewActionModalProps {
  open: boolean;
  kind: ReviewActionKind | null;
  contract: WorkflowContract | null;
  /** True while the underlying mutation is in flight. */
  busy?: boolean;
  onClose: () => void;
  /** Called with the (trimmed) comment; empty string when not required. */
  onConfirm: (comment: string) => void;
}

const META: Record<
  ReviewActionKind,
  {
    title: string;
    commentRequired: boolean;
    confirmVariant: 'default' | 'destructive';
    hint: string;
  }
> = {
  approve: {
    title: 'Aprobar contrato',
    commentRequired: false,
    confirmVariant: 'default',
    hint: 'El comentario es opcional. El contrato avanzará a la siguiente etapa.',
  },
  return: {
    title: 'Devolver al solicitante',
    commentRequired: true,
    confirmVariant: 'destructive',
    hint: 'El comentario es obligatorio. El contrato volverá a estado Borrador.',
  },
  reject: {
    title: 'Rechazar definitivamente',
    commentRequired: true,
    confirmVariant: 'destructive',
    hint: 'El comentario es obligatorio. El contrato quedará en estado Rechazado.',
  },
};

/** Modal that confirms a review action, capturing a comment when required. */
export function ReviewActionModal({
  open,
  kind,
  contract,
  busy,
  onClose,
  onConfirm,
}: ReviewActionModalProps) {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  // Reset the form whenever the modal (re)opens.
  useEffect(() => {
    if (open) {
      setComment('');
      setTouched(false);
    }
  }, [open]);

  if (!kind || !contract) return null;

  const meta = META[kind];
  const trimmed = comment.trim();
  const invalid = meta.commentRequired && trimmed.length === 0;

  const handleConfirm = () => {
    if (invalid) {
      setTouched(true);
      return;
    }
    onConfirm(trimmed);
  };

  const target =
    kind === 'approve'
      ? nextStatusOnApprove(contract.status)
      : kind === 'return'
        ? 'DRAFT'
        : 'REJECTED';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meta.title}
      description={`${contract.folio} · ${contract.provider}`}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={meta.confirmVariant}
            onClick={handleConfirm}
            disabled={(invalid && touched) || busy}
          >
            {busy ? 'Procesando…' : kind === 'approve' ? approveLabel(contract.status) : meta.title}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-foreground/60">
          <Badge variant="secondary">{STATUS_LABELS[contract.status]}</Badge>
          <span aria-hidden>→</span>
          <Badge variant={kind === 'approve' ? 'default' : 'destructive'}>
            {target ? STATUS_LABELS[target] : '—'}
          </Badge>
        </div>

        <label className="block space-y-1.5">
          <span className="font-heading text-xs uppercase tracking-widest text-foreground/60">
            Comentario {meta.commentRequired ? '(obligatorio)' : '(opcional)'}
          </span>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              meta.commentRequired
                ? 'Describe el motivo de la devolución o rechazo…'
                : 'Notas de la aprobación…'
            }
            aria-invalid={invalid && touched}
          />
        </label>

        {invalid && touched ? (
          <p className="font-mono text-xs text-[#dc2626]">
            Debes ingresar un comentario para continuar.
          </p>
        ) : (
          <p className="font-mono text-xs text-foreground/50">{meta.hint}</p>
        )}
      </div>
    </Modal>
  );
}
