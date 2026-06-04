'use client';

import { Badge, Button, useRole } from '@aletheia/frontend-commons';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../../components/EmptyState';
import { PageShell } from '../../../components/PageShell';
import { InboxIcon } from '../../../components/ui/icons';
import type { WorkflowContract } from '../../_shared/adapters';
import { errorMessage, useWorkflow } from '../../_shared/useWorkflow';
import {
  PRIVILEGE_NOT_GRANTED,
  ROLE_REVIEW_PRIVILEGE,
  STATUS_LABELS,
  queueStatusesForRole,
} from '../../_shared/workflow-rules';
import { type ReviewActionKind, ReviewActionModal } from './ReviewActionModal';
import { ReviewContractCard } from './ReviewContractCard';
import { ReviewerNotifications } from './ReviewerNotifications';

export function ReviewPanel() {
  const { role, can } = useRole();
  const wf = useWorkflow();

  const [modalKind, setModalKind] = useState<ReviewActionKind | null>(null);
  const [target, setTarget] = useState<WorkflowContract | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const queueStatuses = queueStatusesForRole(role);
  const queue = useMemo(
    () => (wf.hydrated ? wf.listByStatus(queueStatuses) : []),
    [wf, queueStatuses],
  );

  const reviewPrivilege = role ? ROLE_REVIEW_PRIVILEGE[role] : undefined;
  const hasReviewRole = queueStatuses.length > 0;
  const canReview = reviewPrivilege ? can(reviewPrivilege) : false;

  const openAction = (kind: ReviewActionKind, contract: WorkflowContract) => {
    setActionError(null);
    setTarget(contract);
    setModalKind(kind);
  };

  const closeModal = () => {
    setModalKind(null);
    setTarget(null);
  };

  const handleConfirm = async (comment: string) => {
    if (!target || !modalKind) return;
    setActionError(null);
    try {
      if (modalKind === 'approve') await wf.approve(target.id, { comment });
      else if (modalKind === 'return') await wf.returnToDraft(target.id, { comment });
      else if (modalKind === 'reject') await wf.reject(target.id, { comment });
      closeModal();
    } catch (err) {
      // 403 (privilege not granted) or any validation error from the gateway.
      setActionError(errorMessage(err));
      closeModal();
    }
  };

  const subtitle = hasReviewRole
    ? `Contratos en ${queueStatuses.map((s) => STATUS_LABELS[s]).join(' / ')}`
    : 'Revisión del flujo de contratos';

  return (
    <PageShell
      title="Panel de revisión"
      subtitle={subtitle}
      active="panel"
      actions={
        <Button
          variant="neutral"
          size="sm"
          disabled={wf.isFetching}
          onClick={() => wf.refetch()}
          title="Actualizar lista"
        >
          {wf.isFetching ? 'Actualizando…' : 'Actualizar'}
        </Button>
      }
    >
      <ReviewerNotifications />

      {actionError ? (
        <div className="rounded-base border-2 border-border bg-[#fee2e2] px-4 py-3 font-sans text-sm text-[#991b1b]">
          {actionError}
        </div>
      ) : null}

      {!wf.hydrated ? (
        <EmptyState title="Cargando contratos…" />
      ) : wf.isError ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="No se pudieron cargar los contratos"
          description={errorMessage(wf.error)}
        />
      ) : !hasReviewRole ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="Tu rol no participa en la revisión"
          description={`El rol ${role ?? 'actual'} no tiene una cola de revisión asignada. Los roles de revisión son Administrador, Abogado y Aprobador.`}
        />
      ) : !canReview ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="Sin privilegio de revisión"
          description={PRIVILEGE_NOT_GRANTED}
        />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="h-10 w-10" />}
          title="No hay contratos pendientes"
          description="No tienes contratos esperando tu revisión en este momento."
        />
      ) : (
        <>
          <div className="flex items-center gap-2 font-sans text-sm text-foreground/60">
            <Badge variant="default">{queue.length}</Badge>
            <span>contrato{queue.length === 1 ? '' : 's'} en tu cola</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((contract) => (
              <ReviewContractCard
                key={contract.id}
                contract={contract}
                role={role!}
                disabled={wf.mutating}
                onAction={openAction}
              />
            ))}
          </div>
        </>
      )}

      <ReviewActionModal
        open={modalKind !== null}
        kind={modalKind}
        contract={target}
        busy={wf.mutating}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />
    </PageShell>
  );
}
