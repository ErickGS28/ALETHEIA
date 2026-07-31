'use client';

import { useRole } from '@aletheia/frontend-commons';
import * as React from 'react';
import type { Contract, ContractStatus } from '../../_shared/domain/contract';
import { computeSla } from '../../_shared/domain/contract';

export interface ContractFilters {
  search: string;
  status: ContractStatus | 'ALL';
  /** Area filter holds the numeric areaId as string ('ALL' = no filter). */
  area: string | 'ALL';
}

const INITIAL: ContractFilters = { search: '', status: 'ALL', area: 'ALL' };

/**
 * Applies RBAC view-gating + client-side UI filters over the already
 * backend-scoped contract list.
 * - CONTRACT_VIEW_ALL  → backend returns everything; area dropdown is shown.
 * - CONTRACT_VIEW_AREA → backend already scopes to the user's area (JWT).
 * - neither            → no access.
 *
 * Status/area/search are applied client-side here for instant UX (the same
 * filters can also be pushed to the backend query params by the caller).
 */
export function useContractFilters(contracts: Contract[]) {
  const { can } = useRole();
  const [filters, setFilters] = React.useState<ContractFilters>(INITIAL);

  const viewAll = can('CONTRACT_VIEW_ALL');
  const viewAreaOnly = !viewAll && can('CONTRACT_VIEW_AREA');
  const noAccess = !viewAll && !viewAreaOnly;

  const filtered = React.useMemo(() => {
    if (noAccess) return [];
    const q = filters.search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (filters.status !== 'ALL' && c.status !== filters.status) return false;
      if (filters.area !== 'ALL' && String(c.areaId) !== filters.area) return false;
      if (q) {
        const haystack = `${c.folio} ${c.title} ${c.providerName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [contracts, filters, noAccess]);

  const withSla = React.useMemo(
    () => filtered.map((c) => ({ contract: c, sla: computeSla(c) })),
    [filtered],
  );

  const update = React.useCallback((patch: Partial<ContractFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => setFilters(INITIAL), []);

  return {
    filters,
    update,
    reset,
    rows: withSla,
    viewAll,
    viewAreaOnly,
    noAccess,
  };
}
