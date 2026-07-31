// RTK Query endpoints for solicitudes-mf. Injected into the shared baseApi
// from @aletheia/frontend-commons (do NOT recreate the api). Hooks receive the
// already-unwrapped payload (the gateway envelope is stripped by baseApi).

import { baseApi } from '@aletheia/frontend-commons';
import type {
  AuditLog,
  BackendContract,
  CatalogItem,
  CreateContractBody,
  ListContractsParams,
  RequiredDoc,
  UpdateContractBody,
  WorkflowState,
} from './types';
import type { BackendProviderType } from './types';

export const contractsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    /* ─── Contracts ──────────────────────────────────────────────────── */
    listContracts: b.query<BackendContract[], ListContractsParams | undefined>({
      query: (params) => ({ url: '/contracts', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'Contract' as const, id: c.id })),
              { type: 'Contract' as const, id: 'LIST' },
            ]
          : [{ type: 'Contract' as const, id: 'LIST' }],
    }),

    getContract: b.query<BackendContract, number>({
      query: (id) => `/contracts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Contract', id }],
    }),

    createContract: b.mutation<BackendContract, CreateContractBody>({
      query: (body) => ({ url: '/contracts', method: 'POST', body }),
      invalidatesTags: [{ type: 'Contract', id: 'LIST' }],
    }),

    updateContract: b.mutation<BackendContract, { id: number; body: UpdateContractBody }>({
      query: ({ id, body }) => ({ url: `/contracts/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
      ],
    }),

    submitContract: b.mutation<BackendContract, number>({
      query: (id) => ({ url: `/contracts/${id}/submit`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
        { type: 'Workflow', id },
        { type: 'Report', id },
      ],
    }),

    cancelContract: b.mutation<BackendContract, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/contracts/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
        { type: 'Workflow', id },
        { type: 'Report', id },
      ],
    }),

    recoverContract: b.mutation<BackendContract, number>({
      query: (id) => ({ url: `/contracts/${id}/recover`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Contract', id },
        { type: 'Contract', id: 'LIST' },
        { type: 'Workflow', id },
        { type: 'Report', id },
      ],
    }),

    /* ─── Detail: bitácora + workflow/SLA ────────────────────────────── */
    getAudit: b.query<AuditLog[], number>({
      query: (contractId) => `/reports/audit/${contractId}`,
      providesTags: (_r, _e, id) => [{ type: 'Report', id }],
    }),

    getWorkflow: b.query<WorkflowState, number>({
      query: (contractId) => `/workflow/${contractId}`,
      providesTags: (_r, _e, id) => [{ type: 'Workflow', id }],
    }),

    /* ─── Catalogs ───────────────────────────────────────────────────── */
    listSocieties: b.query<CatalogItem[], void>({
      query: () => '/societies',
      providesTags: [{ type: 'Society', id: 'LIST' }],
    }),

    listAreas: b.query<CatalogItem[], void>({
      query: () => '/areas',
      providesTags: [{ type: 'Area', id: 'LIST' }],
    }),

    requiredDocs: b.query<RequiredDoc[], BackendProviderType>({
      query: (providerType) => ({ url: '/documents/required', params: { providerType } }),
    }),
  }),
});

export const {
  useListContractsQuery,
  useGetContractQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useSubmitContractMutation,
  useCancelContractMutation,
  useRecoverContractMutation,
  useGetAuditQuery,
  useGetWorkflowQuery,
  useListSocietiesQuery,
  useListAreasQuery,
  useRequiredDocsQuery,
} = contractsApi;
