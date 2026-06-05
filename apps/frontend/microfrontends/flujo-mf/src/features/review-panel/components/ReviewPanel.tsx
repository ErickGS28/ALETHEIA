'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  LoadingState,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { useMemo, useState } from 'react';
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

const ACTION_SUCCESS: Record<ReviewActionKind, { title: string; description: string }> = {
  approve: {
    title: 'Contrato aprobado',
    description: 'El contrato avanzó a la siguiente etapa del flujo.',
  },
  return: {
    title: 'Contrato devuelto',
    description: 'El contrato regresó a Borrador para que el solicitante lo corrija.',
  },
  reject: {
    title: 'Contrato rechazado',
    description: 'El contrato quedó en estado Rechazado de forma definitiva.',
  },
};

export function ReviewPanel() {
  const { role, can } = useRole();
  const wf = useWorkflow();
  const toast = useToast();

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
    setActionError(null);
  };

  const handleConfirm = async (comment: string) => {
    if (!target || !modalKind) return;
    setActionError(null);
    const kind = modalKind;
    try {
      if (kind === 'approve') await wf.approve(target.id, { comment });
      else if (kind === 'return') await wf.returnToDraft(target.id, { comment });
      else if (kind === 'reject') await wf.reject(target.id, { comment });
      // Solo en éxito: cierra el modal y notifica.
      closeModal();
      const ok = ACTION_SUCCESS[kind];
      toast.success(ok.title, ok.description);
    } catch (err) {
      // 403 (privilege not granted) o cualquier error de validación del gateway.
      // Mantén el modal ABIERTO y muestra el error DENTRO para que el usuario lo vea.
      setActionError(errorMessage(err));
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

      {!wf.hydrated ? (
        <Card>
          <CardContent className="pt-6">
            <LoadingState message="Cargando contratos…" />
          </CardContent>
        </Card>
      ) : wf.isError ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<InboxIcon className="h-10 w-10" />}
              title="No se pudieron cargar los contratos"
              description={errorMessage(wf.error)}
            />
          </CardContent>
        </Card>
      ) : !hasReviewRole ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<InboxIcon className="h-10 w-10" />}
              title="Tu rol no participa en la revisión"
              description={`El rol ${role ?? 'actual'} no tiene una cola de revisión asignada. Los roles de revisión son Administrador, Abogado y Aprobador.`}
            />
          </CardContent>
        </Card>
      ) : !canReview ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<InboxIcon className="h-10 w-10" />}
              title="Sin privilegio de revisión"
              description={PRIVILEGE_NOT_GRANTED}
            />
          </CardContent>
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<InboxIcon className="h-10 w-10" />}
              title="No hay contratos pendientes"
              description="No tienes contratos esperando tu revisión en este momento."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
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
        error={actionError}
        onClose={closeModal}
        onConfirm={handleConfirm}
      />
    </PageShell>
  );
}
