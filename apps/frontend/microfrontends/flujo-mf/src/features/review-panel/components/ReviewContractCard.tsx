'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
} from '@aletheia/frontend-commons';
import type { Privilege, Role } from '@aletheia/frontend-commons';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckIcon,
  RejectIcon,
  ReturnIcon,
  TimelineIcon,
} from '../../../components/ui/icons';
import { SlaIndicator } from '../../../components/ui/sla-indicator';
import { type WorkflowContract, providerTypeLabel } from '../../_shared/adapters';
import { useContractWorkflow } from '../../_shared/useWorkflow';
import {
  ROLE_REVIEW_PRIVILEGE,
  STATUS_LABELS,
  approveLabel,
  canDefinitiveReject,
  statusBadgeVariant,
} from '../../_shared/workflow-rules';
import type { ReviewActionKind } from './ReviewActionModal';

interface ReviewContractCardProps {
  contract: WorkflowContract;
  role: Role;
  disabled?: boolean;
  onAction: (kind: ReviewActionKind, contract: WorkflowContract) => void;
}

/** One contract awaiting review, with real SLA (from /workflow/:id) and gated actions. */
export function ReviewContractCard({
  contract,
  role,
  disabled,
  onAction,
}: ReviewContractCardProps) {
  const { sla, isError: slaError } = useContractWorkflow(contract.id);
  const privilege = ROLE_REVIEW_PRIVILEGE[role] as Privilege;
  const showReject = canDefinitiveReject(contract.status);

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{contract.folio}</CardTitle>
          <Badge variant={statusBadgeVariant(contract.status)}>
            {STATUS_LABELS[contract.status]}
          </Badge>
        </div>
        <p className="font-mono text-sm text-foreground/80">{contract.provider}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs text-foreground/70">
          <div>
            <dt className="text-foreground/40">Sociedad</dt>
            <dd>{contract.society}</dd>
          </div>
          <div>
            <dt className="text-foreground/40">Área</dt>
            <dd>{contract.area}</dd>
          </div>
          <div>
            <dt className="text-foreground/40">Solicitante</dt>
            <dd>ID #{contract.createdById}</dd>
          </div>
          <div>
            <dt className="text-foreground/40">Tipo</dt>
            <dd>{providerTypeLabel(contract.providerType)}</dd>
          </div>
        </dl>

        {sla ? (
          <SlaIndicator sla={sla} />
        ) : slaError ? (
          <Badge variant="destructive">SLA no disponible</Badge>
        ) : (
          <p className="font-mono text-xs text-foreground/40">Calculando SLA…</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-border pt-4">
          <CookiePrivilegeGuard
            privilege={privilege}
            fallback={<Badge variant="secondary">Sin permiso para revisar esta etapa</Badge>}
          >
            <Button size="sm" disabled={disabled} onClick={() => onAction('approve', contract)}>
              <CheckIcon />
              {approveLabel(contract.status)}
            </Button>
            <Button
              variant="neutral"
              size="sm"
              disabled={disabled}
              onClick={() => onAction('return', contract)}
            >
              <ReturnIcon />
              Devolver
            </Button>
            {showReject ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={disabled}
                onClick={() => onAction('reject', contract)}
              >
                <RejectIcon />
                Rechazar
              </Button>
            ) : null}
          </CookiePrivilegeGuard>

          <Link href={`/timeline?contract=${contract.id}`} className="ml-auto">
            <Button variant="link" size="sm">
              <TimelineIcon />
              Historial
              <ArrowRightIcon />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
