// Adapters: backend wire shapes → UI domain shapes used by the views.

import type { AuditEntry, Contract } from '../domain/contract';
import { fromBackendProviderType } from './types';
import type { AuditLog, BackendContract, WorkflowTransition } from './types';

/** Maps a backend contract to the UI `Contract` shape consumed by the views. */
export function adaptContract(c: BackendContract): Contract {
  return {
    id: String(c.id),
    numericId: c.id,
    folio: c.folio,
    title: c.title,
    society: c.society?.name ?? `Sociedad #${c.societyId}`,
    societyId: c.societyId,
    providerName: c.vendorName,
    providerEmail: c.vendorEmail ?? '',
    providerType: fromBackendProviderType(c.providerType),
    area: c.area?.name ?? `Área #${c.areaId}`,
    areaId: c.areaId,
    status: c.status,
    cancelReason: c.cancelReason ?? undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    log: [],
  };
}

export function adaptContracts(list: BackendContract[]): Contract[] {
  return list.map(adaptContract);
}

/** Maps an AuditLog row (GET /reports/audit/:id) to a bitácora entry. */
export function adaptAuditLog(log: AuditLog): AuditEntry {
  return {
    action: log.action,
    user: String(log.userId),
    date: log.createdAt,
    note: log.detail ?? undefined,
  };
}

/** Maps a workflow transition (GET /workflow/:id) to a bitácora entry. */
export function adaptTransition(t: WorkflowTransition): AuditEntry {
  const label = t.action || `${t.fromStatus ?? '—'} → ${t.toStatus ?? '—'}`;
  return {
    action: label,
    user: t.performedBy != null ? String(t.performedBy) : '—',
    date: t.performedAt,
    note: t.comment ?? undefined,
  };
}
