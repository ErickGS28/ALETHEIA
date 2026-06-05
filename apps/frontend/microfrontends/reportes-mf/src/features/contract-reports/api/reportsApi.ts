'use client';

import { baseApi } from '@aletheia/frontend-commons';

/* ─── Backend shapes (payload already unwrapped by baseApi) ───────────── */

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

export interface ContractRef {
  id: number;
  name: string;
}

export interface Contract {
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
  area?: ContractRef;
  society?: ContractRef;
}

export interface AuditLog {
  id: number;
  contractId: number;
  userId: number;
  /** Nombre legible del usuario que ejecutó la acción (si el backend lo resuelve). */
  userName?: string;
  /** Correo del usuario, usado como respaldo cuando no hay nombre. */
  userEmail?: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface ReportContractsParams {
  status?: ContractStatus;
  areaId?: number;
  providerType?: 'FISICA' | 'MORAL';
}

/* ─── Endpoints ───────────────────────────────────────────────────────── */

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    reportContracts: b.query<Contract[], ReportContractsParams | undefined>({
      query: (params) => ({ url: '/reports/contracts', params: params ?? undefined }),
      providesTags: ['Report'],
    }),
    auditLog: b.query<AuditLog[], number>({
      query: (contractId) => `/reports/audit/${contractId}`,
      providesTags: ['Report'],
    }),
  }),
});

export const { useReportContractsQuery, useAuditLogQuery } = reportsApi;
