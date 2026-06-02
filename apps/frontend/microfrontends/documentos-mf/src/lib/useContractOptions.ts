'use client';

import { useMemo } from 'react';
import { useListContractsQuery } from '../api/documentsApi';
import { type ContractOption, adaptContractOption } from './adapter';

/**
 * Fetches contracts and adapts them into selector options.
 * Exposes the loading/error state plus a quick lookup by id.
 */
export function useContractOptions() {
  const { data, isLoading, isError, refetch } = useListContractsQuery();

  const options = useMemo<ContractOption[]>(() => (data ?? []).map(adaptContractOption), [data]);

  const byId = useMemo(() => {
    const map = new Map<number, ContractOption>();
    for (const opt of options) map.set(opt.id, opt);
    return map;
  }, [options]);

  return { options, byId, isLoading, isError, refetch };
}
