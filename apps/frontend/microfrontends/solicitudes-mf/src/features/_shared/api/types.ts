// Backend shapes (payload already unwrapped by baseApi) + UI domain types.

import type { ContractStatus, ProviderType } from '../domain/contract';

/* ─── Backend wire shapes ────────────────────────────────────────────── */

/** providerType as the gateway expects/returns it. */
export type BackendProviderType = 'FISICA' | 'MORAL';

export interface BackendCatalogRef {
  id: number;
  name: string;
}

/** Contract as returned by the gateway (GET /contracts, /contracts/:id). */
export interface BackendContract {
  id: number;
  folio: string;
  title: string;
  vendorName: string;
  vendorEmail?: string | null;
  providerType: BackendProviderType;
  status: ContractStatus;
  areaId: number;
  societyId: number;
  templateId?: number | null;
  createdById: number;
  submittedAt?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  area?: BackendCatalogRef | null;
  society?: BackendCatalogRef | null;
}

/** Society / Area catalog entry. */
export interface CatalogItem {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** GET /documents/required?providerType= */
export interface RequiredDoc {
  type: string;
  label: string;
}

/** GET /reports/audit/:contractId */
export interface AuditLog {
  id: number;
  contractId: number;
  userId: number;
  action: string;
  detail?: string | null;
  createdAt: string;
}

/** GET /workflow/:contractId */
export interface WorkflowTransition {
  id: number;
  fromStatus: ContractStatus | null;
  toStatus: ContractStatus | null;
  action: string;
  comment?: string | null;
  performedBy?: string | number | null;
  performedAt: string;
}

export interface WorkflowState {
  contractId: number;
  status: ContractStatus;
  stage: {
    id: number;
    name: string;
    order: number;
    roleRequired?: string;
    slaHours?: number;
  } | null;
  enteredAt?: string | null;
  sla: { hoursElapsed: number; color: 'GREEN' | 'YELLOW' | 'RED' } | null;
  transitions: WorkflowTransition[];
}

/* ─── List filters / create payload ──────────────────────────────────── */

export interface ListContractsParams {
  status?: ContractStatus;
  areaId?: number;
  providerType?: BackendProviderType;
}

export interface CreateContractBody {
  title: string;
  vendorName: string;
  vendorEmail?: string;
  providerType: BackendProviderType;
  areaId: number;
  societyId: number;
  templateId?: number;
}

export type UpdateContractBody = Partial<CreateContractBody>;

/* ─── providerType mapping (UI ↔ backend) ────────────────────────────── */

export function toBackendProviderType(p: ProviderType): BackendProviderType {
  return p === 'PERSONA_FISICA' ? 'FISICA' : 'MORAL';
}

export function fromBackendProviderType(p: BackendProviderType): ProviderType {
  return p === 'FISICA' ? 'PERSONA_FISICA' : 'PERSONA_MORAL';
}
