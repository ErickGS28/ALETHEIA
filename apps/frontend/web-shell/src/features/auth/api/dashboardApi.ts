import { baseApi } from '@aletheia/frontend-commons';

export type DashboardContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

export interface DashboardContract {
  id: number;
  status: DashboardContractStatus;
  createdAt: string;
  updatedAt: string;
}

// Solo lo necesario para las KPIs del panel de control (Administrador tiene
// CONTRACT_VIEW_ALL, así que GET /contracts ya le devuelve todo sin scoping).
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listContractsForDashboard: b.query<DashboardContract[], void>({
      query: () => '/contracts',
      providesTags: [{ type: 'Contract', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const { useListContractsForDashboardQuery } = dashboardApi;
