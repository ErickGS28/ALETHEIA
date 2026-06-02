import { baseApi } from '@aletheia/frontend-commons';

/** Estado del contrato en el gateway. */
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

/** Contrato (payload ya desempaquetado por baseApi). */
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
  area?: { id: number; name: string };
  society?: { id: number; name: string };
}

/** Apoderado (catálogo). */
export interface Apoderado {
  id: number;
  name: string;
  legalPower: string;
  isActive: boolean;
}

/** Método de firma soportado por el backend. */
export type SignatureMethod = 'CANVAS' | 'ELECTRONIC';

/** Firma registrada (payload ya desempaquetado). */
export interface Signature {
  id: number;
  contractId: number;
  apoderadoId?: number;
  signedById: number;
  method: SignatureMethod;
  /** dataURL base64 del canvas. */
  signatureData: string;
  signedAt: string;
}

/** Body para registrar una firma. */
export interface CreateSignatureBody {
  contractId: number;
  method?: SignatureMethod;
  /** dataURL base64 del canvas. */
  signatureData: string;
  apoderadoId?: number;
}

/** Parámetros para listar contratos. */
export interface ListContractsParams {
  status?: ContractStatus;
  areaId?: number;
  providerType?: 'FISICA' | 'MORAL';
}

export const signaturesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listContracts: b.query<Contract[], ListContractsParams | undefined>({
      query: (params) => ({ url: '/contracts', params: params ?? undefined }),
      providesTags: ['Contract'],
    }),
    getContract: b.query<Contract, number | string>({
      query: (id) => `/contracts/${id}`,
      providesTags: ['Contract'],
    }),
    listApoderados: b.query<Apoderado[], void>({
      query: () => '/apoderados',
      providesTags: ['Apoderado'],
    }),
    listSignatures: b.query<Signature[], number | string>({
      query: (contractId) => `/signatures/${contractId}`,
      providesTags: ['Signature'],
    }),
    createSignature: b.mutation<Signature, CreateSignatureBody>({
      query: ({ contractId, ...body }) => ({
        url: `/signatures/${contractId}`,
        method: 'POST',
        body: { method: 'CANVAS' as const, ...body },
      }),
      invalidatesTags: ['Signature', 'Contract'],
    }),
  }),
});

export const {
  useListContractsQuery,
  useGetContractQuery,
  useListApoderadosQuery,
  useListSignaturesQuery,
  useCreateSignatureMutation,
} = signaturesApi;
