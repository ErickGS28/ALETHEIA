// Adapters mapping backend payloads (flujo-api) to the UI domain types the
// flujo-mf components already render. This preserves the existing render/UX
// while the data now comes from the gateway instead of the mock layer.

import type {
  ApiContract,
  ApiNotification,
  ApiWorkflowState,
  ApiWorkflowTransition,
  ContractStatus,
  SlaColor,
} from './flujo-api';
import type { SlaLevel, SlaResult } from './workflow-rules';

// ─── UI domain types (shape the components consume) ─────────────────────────

export type { ContractStatus };

export type TransitionAction = 'SUBMIT' | 'APPROVE' | 'RETURN' | 'REJECT' | 'RECOVER';

/** A contract as tracked by the review workflow (UI shape). */
export interface WorkflowContract {
  /** Numeric backend id rendered as string for stable React keys / routing. */
  id: string;
  folio: string;
  provider: string;
  /** Legal nature of the provider, drives the "Tipo" label. */
  providerType: 'FISICA' | 'MORAL';
  society: string;
  area: string;
  status: ContractStatus;
  enteredAt: string;
  /**
   * Numeric id of the user who created the contract. The backend does not
   * expose the creator's name, so the UI must render a truthful identifier
   * (e.g. "ID #12") rather than a misleading name.
   */
  createdById: number;
}

/** Spanish label for the provider's legal nature. */
export function providerTypeLabel(providerType: 'FISICA' | 'MORAL'): string {
  return providerType === 'MORAL' ? 'Persona Moral' : 'Persona Física';
}

/** A single entry in a contract's workflow history (UI shape). */
export interface WorkflowTransition {
  id: string;
  contractId: string;
  from: ContractStatus;
  to: ContractStatus;
  action: TransitionAction;
  performedBy: string;
  comment?: string;
  timestamp: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

const KNOWN_ACTIONS: TransitionAction[] = ['SUBMIT', 'APPROVE', 'RETURN', 'REJECT', 'RECOVER'];

function normalizeAction(action: string): TransitionAction {
  const upper = action?.toUpperCase();
  return (KNOWN_ACTIONS as string[]).includes(upper) ? (upper as TransitionAction) : 'APPROVE';
}

/** Map a backend contract to the UI WorkflowContract shape. */
export function toWorkflowContract(c: ApiContract): WorkflowContract {
  return {
    id: String(c.id),
    folio: c.folio,
    provider: c.vendorName,
    providerType: c.providerType,
    society: c.society?.name ?? `Sociedad #${c.societyId}`,
    area: c.area?.name ?? `Área #${c.areaId}`,
    status: c.status,
    // Best available "entered current stage" timestamp from the contract record.
    enteredAt: c.submittedAt ?? c.updatedAt ?? c.createdAt,
    createdById: c.createdById,
  };
}

/** Map a backend workflow transition to the UI WorkflowTransition shape. */
export function toWorkflowTransition(
  contractId: number,
  tr: ApiWorkflowTransition,
): WorkflowTransition {
  return {
    id: String(tr.id),
    contractId: String(contractId),
    from: tr.fromStatus,
    to: tr.toStatus,
    action: normalizeAction(tr.action),
    performedBy: tr.performedBy != null ? String(tr.performedBy) : 'Sistema',
    comment: tr.comment?.trim() || undefined,
    timestamp: tr.performedAt,
  };
}

// ─── SLA mapping (use the backend color directly) ───────────────────────────

const COLOR_TO_LEVEL: Record<SlaColor, SlaLevel> = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};

const LEVEL_LABEL: Record<SlaLevel, string> = {
  green: 'En tiempo',
  yellow: 'Por vencer',
  red: 'SLA superado',
  none: 'Sin SLA',
};

/**
 * Build the SlaResult the UI renders from the backend workflow state. The
 * semaphore color (GREEN/YELLOW/RED) is authoritative; ratio/remaining are
 * derived from hoursElapsed + the stage SLA budget when available.
 */
export function toSlaResult(state: ApiWorkflowState): SlaResult {
  const sla = state.sla;
  const slaHours = state.stage?.slaHours ?? null;

  if (!sla) {
    return {
      level: 'none',
      elapsedHours: 0,
      slaHours,
      ratio: null,
      remainingHours: null,
      label: LEVEL_LABEL.none,
    };
  }

  const level = COLOR_TO_LEVEL[sla.color] ?? 'none';
  const elapsedHours = Math.max(0, sla.hoursElapsed);
  const ratio = slaHours != null && slaHours > 0 ? elapsedHours / slaHours : null;
  const remainingHours = slaHours != null ? slaHours - elapsedHours : null;

  return {
    level,
    elapsedHours,
    slaHours,
    ratio,
    remainingHours,
    label: LEVEL_LABEL[level],
  };
}

/** Map a backend notification to a light UI shape (id kept numeric). */
export interface UiNotification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  contractId?: number;
}

export function toUiNotification(n: ApiNotification): UiNotification {
  return {
    id: n.id,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt,
    contractId: n.contractId,
  };
}
