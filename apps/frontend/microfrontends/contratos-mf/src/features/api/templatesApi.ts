// RTK Query endpoints para plantillas (catálogo /templates del gateway).
// El baseApi ya desempaqueta el envoltorio { data, ... }, por lo que los hooks
// reciben el payload directo (BackendTemplate / BackendTemplate[]).

import { type PageSetup, baseApi } from '@aletheia/frontend-commons';

/** Plantilla tal como la devuelve el backend (contracts-service). */
export interface BackendTemplate {
  id: number;
  name: string;
  /** HTML del editor WYSIWYG. */
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateBody {
  name: string;
  content: string;
}

export interface UpdateTemplateBody {
  name?: string;
  content?: string;
  isActive?: boolean;
}

/** Subset of the Contract returned by GET /contracts that el selector de "Elaborar documento" necesita. */
export interface BackendContract {
  id: number;
  folio: string;
  title: string;
  vendorName: string;
  status: string;
  society?: { id: number; name: string } | null;
}

/**
 * Documento elaborado de un contrato (cuerpo HTML + diseño), persistido en el
 * servidor vía GET/PUT /contracts/:id/document. La fuente de verdad es el servidor;
 * localStorage queda solo como caché de borrador local.
 */
export interface ContractDocumentBody {
  body: string;
  header?: string;
  footer?: string;
  pageSetup?: PageSetup;
}

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    listTemplates: b.query<BackendTemplate[], void>({
      query: () => ({ url: '/templates' }),
      providesTags: ['Template'],
    }),
    getTemplate: b.query<BackendTemplate, number>({
      query: (id) => `/templates/${id}`,
      providesTags: ['Template'],
    }),
    createTemplate: b.mutation<BackendTemplate, CreateTemplateBody>({
      query: (body) => ({ url: '/templates', method: 'POST', body }),
      invalidatesTags: ['Template'],
    }),
    updateTemplate: b.mutation<BackendTemplate, { id: number; body: UpdateTemplateBody }>({
      query: ({ id, body }) => ({ url: `/templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Template'],
    }),
    // GET /contracts — alimenta el selector de contrato de "Elaborar documento".
    listContracts: b.query<BackendContract[], void>({
      query: () => ({ url: '/contracts' }),
      providesTags: ['Contract'],
    }),
    // GET /contracts/:id/document — documento elaborado guardado (null si no existe).
    getContractDocument: b.query<ContractDocumentBody | null, number>({
      query: (id) => ({ url: `/contracts/${id}/document` }),
      providesTags: (_res, _err, id) => [{ type: 'Document', id: `contract-${id}` }],
    }),
    // PUT /contracts/:id/document — persiste el documento elaborado en el servidor.
    saveContractDocument: b.mutation<
      { fileUrl: string; savedAt: string },
      { id: number; body: ContractDocumentBody }
    >({
      query: ({ id, body }) => ({ url: `/contracts/${id}/document`, method: 'PUT', body }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Document', id: `contract-${id}` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useListContractsQuery,
  useGetContractDocumentQuery,
  useSaveContractDocumentMutation,
} = templatesApi;
