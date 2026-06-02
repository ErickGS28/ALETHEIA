'use client';

import { useMemo } from 'react';
import { type AuditLog, useAuditLogQuery } from '../../contract-reports/api/reportsApi';

/**
 * Returns the full audit trail for a contract, sorted newest-first (HU-24).
 * `contractId` 0/unset => skips the request and returns an empty list.
 */
export function useAuditLog(contractId: number) {
  const { data, isLoading, isFetching, isError, refetch } = useAuditLogQuery(contractId, {
    skip: !contractId,
  });

  const entries = useMemo<AuditLog[]>(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data]);

  return { entries, isLoading, isFetching, isError, refetch };
}
