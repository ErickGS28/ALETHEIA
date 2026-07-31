'use client';

import { useMemo, useState } from 'react';
import { CONTRACT_STATUSES } from '../../../lib/contract-meta';
import { type Contract, type ContractStatus, useReportContractsQuery } from '../api/reportsApi';

export interface ReportFilters {
  /** '' => all */
  status: ContractStatus | '';
  /** Numeric area id as string ('' => all). */
  areaId: string;
  /** '' => all */
  providerType: 'FISICA' | 'MORAL' | '';
}

const EMPTY_FILTERS: ReportFilters = { status: '', areaId: '', providerType: '' };

export interface StatusKpi {
  status: ContractStatus;
  label: string;
  count: number;
}

export interface AreaOption {
  id: string;
  name: string;
}

/* ─── Hook ────────────────────────────────────────────────────────────── */

export function useReports() {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);

  // Status + providerType are pushed server-side; areaId is applied client-side so the
  // area dropdown stays populated from whatever the backend returned (no separate catalog call).
  const queryParams = useMemo(
    () => ({
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.providerType ? { providerType: filters.providerType } : {}),
    }),
    [filters.status, filters.providerType],
  );

  const {
    data: rawContracts,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useReportContractsQuery(queryParams);

  const contracts = useMemo<Contract[]>(() => rawContracts ?? [], [rawContracts]);

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const hasActiveFilters =
    filters.status !== '' || filters.areaId !== '' || filters.providerType !== '';

  // Distinct areas present in the returned contracts (for the area filter dropdown).
  const areaOptions = useMemo<AreaOption[]>(() => {
    const map = new Map<string, string>();
    for (const c of contracts) {
      if (c.area) map.set(String(c.area.id), c.area.name);
      else if (c.areaId != null) map.set(String(c.areaId), `Área #${c.areaId}`);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [contracts]);

  const filtered = useMemo(() => {
    if (!filters.areaId) return contracts;
    return contracts.filter((c) => String(c.areaId) === filters.areaId);
  }, [contracts, filters.areaId]);

  // KPI totals per status, computed over the filtered set, only for statuses present.
  const kpis = useMemo<StatusKpi[]>(() => {
    const counts = new Map<ContractStatus, number>();
    for (const c of filtered) {
      counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    }
    return CONTRACT_STATUSES.filter((s) => counts.has(s.id)).map((s) => ({
      status: s.id,
      label: s.label,
      count: counts.get(s.id) ?? 0,
    }));
  }, [filtered]);

  return {
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    contracts: filtered,
    total: filtered.length,
    kpis,
    areaOptions,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
