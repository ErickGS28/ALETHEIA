'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useRole,
} from '@aletheia/frontend-commons';
import { ArrowLeft, Pencil, RotateCcw, Send, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { adaptAuditLog, adaptContract, adaptTransition } from '../../_shared/api/adapters';
import {
  useCancelContractMutation,
  useGetAuditQuery,
  useGetContractQuery,
  useGetWorkflowQuery,
  useRecoverContractMutation,
  useSubmitContractMutation,
} from '../../_shared/api/contracts-api';
import { CancelContractModal } from '../../_shared/components/CancelContractModal';
import { ErrorBanner } from '../../_shared/components/ErrorBanner';
import { PageHeader } from '../../_shared/components/PageHeader';
import { RequiredDocsList } from '../../_shared/components/RequiredDocsList';
import { SlaIndicator } from '../../_shared/components/SlaIndicator';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import {
  type AuditEntry,
  PROVIDER_TYPE_LABEL,
  type SlaLevel,
  computeSla,
  slaFromColor,
} from '../../_shared/domain/contract';
import { getErrorMessage } from '../../_shared/lib/error';
import { formatDate } from '../../_shared/lib/format';
import { AuditTimeline } from './AuditTimeline';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b-2 border-border/40 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-heading text-xs tracking-widest uppercase text-foreground/60">
        {label}
      </span>
      <span className="font-sans text-sm">{children}</span>
    </div>
  );
}

export function ContractDetailView({ contractId }: { contractId: string }) {
  const router = useRouter();
  const { can } = useRole();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const numericId = Number(contractId);
  const validId = !Number.isNaN(numericId);
  const canViewReports = can('REPORTS_VIEW');

  const {
    data: backendContract,
    isLoading,
    isError,
    refetch,
  } = useGetContractQuery(numericId, { skip: !validId });

  // Workflow → timeline + real SLA (accesible para todos los roles): es la
  // fuente principal de la bitácora. El audit log (GET /reports/audit/:id)
  // exige REPORTS_VIEW, así que solo se consulta cuando el rol lo permite;
  // de lo contrario el SOLICITANTE recibe 403 y la bitácora se rompe.
  const { data: workflow } = useGetWorkflowQuery(numericId, { skip: !validId });
  const { data: auditLog } = useGetAuditQuery(numericId, {
    skip: !validId || !canViewReports,
  });

  const [submitContract] = useSubmitContractMutation();
  const [cancelContract] = useCancelContractMutation();
  const [recoverContract] = useRecoverContractMutation();

  const handleSubmit = async (id: number) => {
    setActionError(null);
    try {
      await submitContract(id).unwrap();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo enviar la solicitud a revisión.'));
    }
  };

  const handleRecover = async (id: number) => {
    setActionError(null);
    try {
      await recoverContract(id).unwrap();
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo recuperar la solicitud.'));
    }
  };

  const handleCancel = async (id: number, reason: string) => {
    setActionError(null);
    try {
      await cancelContract({ id, reason }).unwrap();
      setCancelOpen(false);
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo cancelar la solicitud.'));
    }
  };

  if (!validId || isError) {
    return (
      <main className="bg-grid min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader title="Solicitud" />
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="font-sans text-sm text-foreground/70">
                {validId ? 'No se pudo cargar la solicitud.' : 'Solicitud no encontrada.'}
              </p>
              <div className="flex gap-2">
                {validId && (
                  <Button variant="neutral" size="sm" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                )}
                <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
                  <ArrowLeft className="h-4 w-4" /> Volver al listado
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (isLoading || !backendContract) {
    return (
      <main className="bg-grid min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-sans text-sm text-foreground/40">Cargando…</p>
        </div>
      </main>
    );
  }

  const contract = adaptContract(backendContract);

  const isDraft = contract.status === 'DRAFT';
  const isCancelled = contract.status === 'CANCELLED';
  const isTerminal =
    contract.status === 'SIGNED' ||
    contract.status === 'CANCELLED' ||
    contract.status === 'REJECTED';

  const canEdit = can('CONTRACT_EDIT') && isDraft;
  const canSubmit = can('CONTRACT_SUBMIT') && isDraft;
  const canCancel = can('CONTRACT_CANCEL') && !isTerminal;
  const canRecover = can('CONTRACT_RECOVER') && isCancelled;
  const hasActions = canEdit || canSubmit || canCancel || canRecover;

  // Real SLA comes from the workflow; fall back to the time-based heuristic.
  const sla: SlaLevel = workflow?.sla ? slaFromColor(workflow.sla.color) : computeSla(contract);

  // Bitácora: workflow transitions are the primary source (accesible para todos
  // los roles). El audit log solo se usa como complemento cuando el rol tiene
  // REPORTS_VIEW y el workflow aún no tiene transiciones.
  const timeline: AuditEntry[] =
    workflow && workflow.transitions.length > 0
      ? workflow.transitions.map(adaptTransition)
      : (auditLog ?? []).map(adaptAuditLog);

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title={contract.title}
          subtitle={contract.folio}
          actions={
            <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          }
        />

        {/* Status + SLA strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-base border-2 border-border bg-background px-4 py-3 shadow-shadow">
          <span className="font-heading text-xs tracking-widest uppercase text-foreground/60">
            Estado
          </span>
          <StatusBadge status={contract.status} />
          <span className="mx-1 h-5 w-[2px] bg-border" aria-hidden />
          <span className="font-heading text-xs tracking-widest uppercase text-foreground/60">
            SLA
          </span>
          <SlaIndicator level={sla} />
        </div>

        {/* Action bar */}
        {hasActions && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                variant="neutral"
                size="sm"
                onClick={() => router.push(`/crear?id=${contract.id}`)}
              >
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" onClick={() => handleSubmit(contract.numericId)}>
                <Send className="h-4 w-4" /> Enviar a revisión
              </Button>
            )}
            {canRecover && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRecover(contract.numericId)}
              >
                <RotateCcw className="h-4 w-4" /> Recuperar
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setActionError(null);
                  setCancelOpen(true);
                }}
              >
                <XCircle className="h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        )}

        {/* Backend errors (403/400) from the actions above */}
        {actionError && (
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* General data */}
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Datos generales</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Folio">{contract.folio}</InfoRow>
                <InfoRow label="Sociedad">{contract.society}</InfoRow>
                <InfoRow label="Área requirente">{contract.area}</InfoRow>
                <InfoRow label="Proveedor">{contract.providerName}</InfoRow>
                <InfoRow label="Email">{contract.providerEmail || '—'}</InfoRow>
                <InfoRow label="Tipo de proveedor">
                  {PROVIDER_TYPE_LABEL[contract.providerType]}
                </InfoRow>
                <InfoRow label="Creada">{formatDate(contract.createdAt)}</InfoRow>
                <InfoRow label="Actualizada">{formatDate(contract.updatedAt)}</InfoRow>
                {contract.cancelReason && (
                  <InfoRow label="Motivo de cancelación">{contract.cancelReason}</InfoRow>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos requeridos</CardTitle>
                <CardDescription>Según tipo de proveedor (informativo)</CardDescription>
              </CardHeader>
              <CardContent>
                <RequiredDocsList providerType={contract.providerType} />
              </CardContent>
            </Card>
          </div>

          {/* Bitácora */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Bitácora</CardTitle>
                <CardDescription>Historial cronológico</CardDescription>
              </CardHeader>
              <CardContent>
                <AuditTimeline entries={timeline} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CancelContractModal
        contract={cancelOpen ? contract : null}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => handleCancel(contract.numericId, reason)}
      />
    </main>
  );
}
