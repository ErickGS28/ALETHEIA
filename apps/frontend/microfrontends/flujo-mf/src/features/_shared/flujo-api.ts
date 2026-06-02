// RTK Query endpoints for flujo-mf, injected into the shared baseApi
// (@aletheia/frontend-commons). The baseApi already unwraps the gateway's
// { data, statusCode, message } envelope, so each hook receives the payload
// directly (a Contract[], a WorkflowState, a Notification[], etc.).

import { baseApi } from '@aletheia/frontend-commons';

// ─── Backend shapes (payload, already unwrapped) ────────────────────────────

export type ContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ApiContract {
  id: number;
  folio: string;
  title: string;
  vendorName: string;
  vendorEmail?: string;
  providerType: 'FISICA' | 'MORAL';
  status: ContractStatus;
  areaId: number;
  societyId: number;
  templateId?: number;
  createdById: number;
  submittedAt?: string;
  cancelReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  area?: { id: number; name: string };
  society?: { id: number; name: string };
}

export type SlaColor = 'GREEN' | 'YELLOW' | 'RED';

export interface ApiWorkflowStage {
  id: number;
  name: string;
  order: number;
  roleRequired: string;
  slaHours: number;
}

export interface ApiWorkflowTransition {
  id: number;
  fromStatus: ContractStatus;
  toStatus: ContractStatus;
  action: string;
  comment?: string;
  performedBy?: string | number;
  performedAt: string;
}

export interface ApiWorkflowState {
  contractId: number;
  status: ContractStatus;
  stage: ApiWorkflowStage | null;
  enteredAt: string;
  sla: { hoursElapsed: number; color: SlaColor } | null;
  transitions: ApiWorkflowTransition[];
}

export interface ApiNotification {
  id: number;
  userId?: number;
  role?: string;
  contractId?: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ListContractsParams {
  status?: ContractStatus;
  areaId?: number;
  providerType?: 'FISICA' | 'MORAL';
}

interface WorkflowActionArgs {
  contractId: number;
  comment?: string;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export const flujoApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listContracts: b.query<ApiContract[], ListContractsParams | undefined>({
      query: (params) => ({ url: '/contracts', params: params ?? undefined }),
      providesTags: ['Contract'],
    }),

    getWorkflow: b.query<ApiWorkflowState, number>({
      query: (contractId) => `/workflow/${contractId}`,
      providesTags: ['Workflow'],
    }),

    approveWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/approve`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),

    rejectWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/reject`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),

    returnWorkflow: b.mutation<unknown, WorkflowActionArgs>({
      query: ({ contractId, comment }) => ({
        url: `/workflow/${contractId}/return`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Contract', 'Workflow', 'Notification'],
    }),

    listNotifications: b.query<ApiNotification[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),

    markNotificationRead: b.mutation<unknown, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListContractsQuery,
  useGetWorkflowQuery,
  useApproveWorkflowMutation,
  useRejectWorkflowMutation,
  useReturnWorkflowMutation,
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
} = flujoApi;
