'use client';

import { useCallback, useMemo } from 'react';
import {
  type ContractStatus,
  type WorkflowContract,
  type WorkflowTransition,
  toSlaResult,
  toWorkflowContract,
  toWorkflowTransition,
} from './adapters';
import {
  useApproveWorkflowMutation,
  useGetWorkflowQuery,
  useListContractsQuery,
  useRejectWorkflowMutation,
  useReturnWorkflowMutation,
} from './flujo-api';
import type { SlaResult } from './workflow-rules';

/** Human-readable message extracted from an RTK Query error (gateway shape). */
export function errorMessage(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';
  const e = error as { status?: number; data?: { message?: string | string[] } };
  const raw = e.data?.message;
  const msg = Array.isArray(raw) ? raw.join(' · ') : raw;
  if (msg) return msg;
  if (e.status === 403) return 'No cuentas con el privilegio necesario para esta acción.';
  if (e.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  return 'No se pudo completar la operación. Intenta de nuevo.';
}

interface ActorArgs {
  comment?: string;
}

/**
 * Central hook for the review workflow, now backed by the gateway via RTK Query.
 * Lists contracts and exposes the approve / return / reject mutations. Per-contract
 * workflow detail (SLA color + transitions) is fetched with `useContractWorkflow`.
 */
export function useWorkflow() {
  const { data, isLoading, isFetching, isError, error, refetch } = useListContractsQuery();

  const [approveMutation, approveState] = useApproveWorkflowMutation();
  const [returnMutation, returnState] = useReturnWorkflowMutation();
  const [rejectMutation, rejectState] = useRejectWorkflowMutation();

  const contracts: WorkflowContract[] = useMemo(() => (data ?? []).map(toWorkflowContract), [data]);

  // True once the first list response settled (mirrors the old `hydrated` gate).
  const hydrated = !isLoading;

  const listByStatus = useCallback(
    (statuses: ContractStatus[]) => contracts.filter((c) => statuses.includes(c.status)),
    [contracts],
  );

  const getContract = useCallback(
    (id: string): WorkflowContract | undefined => contracts.find((c) => c.id === id),
    [contracts],
  );

  const approve = useCallback(
    (contractId: string, args: ActorArgs) =>
      approveMutation({ contractId: Number(contractId), comment: args.comment }).unwrap(),
    [approveMutation],
  );

  const returnToDraft = useCallback(
    (contractId: string, args: ActorArgs) =>
      returnMutation({ contractId: Number(contractId), comment: args.comment }).unwrap(),
    [returnMutation],
  );

  const reject = useCallback(
    (contractId: string, args: ActorArgs) =>
      rejectMutation({ contractId: Number(contractId), comment: args.comment }).unwrap(),
    [rejectMutation],
  );

  const counts = useMemo(() => {
    const byStatus = {} as Record<ContractStatus, number>;
    for (const c of contracts) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    return byStatus;
  }, [contracts]);

  const mutating = approveState.isLoading || returnState.isLoading || rejectState.isLoading;

  return {
    hydrated,
    isFetching,
    isError,
    error,
    refetch,
    contracts,
    counts,
    listByStatus,
    getContract,
    approve,
    returnToDraft,
    reject,
    mutating,
  };
}

/** Per-contract workflow detail (real SLA color + transition history). */
export function useContractWorkflow(contractId: string | null) {
  const id = contractId != null ? Number(contractId) : undefined;
  const { data, isLoading, isFetching, isError, error } = useGetWorkflowQuery(id as number, {
    skip: id == null || Number.isNaN(id),
  });

  const sla: SlaResult | null = useMemo(() => (data ? toSlaResult(data) : null), [data]);

  const transitions: WorkflowTransition[] = useMemo(() => {
    if (!data) return [];
    return [...data.transitions]
      .map((tr) => toWorkflowTransition(data.contractId, tr))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data]);

  return { workflow: data, sla, transitions, isLoading, isFetching, isError, error };
}
