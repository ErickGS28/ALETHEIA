// RTK Query endpoints for the documentos-mf microfrontend.
// Injected into the shared baseApi from @aletheia/frontend-commons.
import { baseApi } from '@aletheia/frontend-commons';
import type { ApiContract, ApiDocument, ApiRequiredDoc, BackendProviderType } from '../lib/types';

interface UploadDocumentArgs {
  contractId: number;
  file: File;
  body: {
    name: string;
    type: string;
    isRequired?: boolean;
    expiresAt?: string;
  };
}

interface AddVersionArgs {
  documentId: number;
  file: File;
}

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // GET /contracts — used to populate the contract selector.
    listContracts: b.query<ApiContract[], void>({
      query: () => '/contracts',
      providesTags: ['Contract'],
    }),
    // GET /documents/required?providerType=FISICA|MORAL
    requiredDocs: b.query<ApiRequiredDoc[], BackendProviderType>({
      query: (providerType) => ({
        url: '/documents/required',
        params: { providerType },
      }),
    }),
    // GET /documents/:contractId -> Document[] (with versions)
    listDocuments: b.query<ApiDocument[], number>({
      query: (contractId) => `/documents/${contractId}`,
      providesTags: ['Document'],
    }),
    // GET /documents/:id/versions
    listVersions: b.query<ApiDocument['versions'], number>({
      query: (documentId) => `/documents/${documentId}/versions`,
      providesTags: ['Document'],
    }),
    // POST /documents/:contractId — create a document (its first version)
    uploadDocument: b.mutation<ApiDocument, UploadDocumentArgs>({
      query: ({ contractId, file, body }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', body.name);
        formData.append('type', body.type);
        if (body.isRequired !== undefined) formData.append('isRequired', String(body.isRequired));
        if (body.expiresAt) formData.append('expiresAt', body.expiresAt);
        return { url: `/documents/${contractId}`, method: 'POST', body: formData };
      },
      invalidatesTags: ['Document'],
    }),
    // POST /documents/:id/versions — add a new version, bumps currentVersion
    addVersion: b.mutation<ApiDocument, AddVersionArgs>({
      query: ({ documentId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: `/documents/${documentId}/versions`, method: 'POST', body: formData };
      },
      invalidatesTags: ['Document'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListContractsQuery,
  useRequiredDocsQuery,
  useListDocumentsQuery,
  useListVersionsQuery,
  useUploadDocumentMutation,
  useAddVersionMutation,
} = documentsApi;
