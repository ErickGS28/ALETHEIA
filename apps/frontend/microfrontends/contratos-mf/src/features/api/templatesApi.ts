// RTK Query endpoints para plantillas (catálogo /templates del gateway).
// El baseApi ya desempaqueta el envoltorio { data, ... }, por lo que los hooks
// reciben el payload directo (BackendTemplate / BackendTemplate[]).

import { baseApi } from '@aletheia/frontend-commons';

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
  }),
  overrideExisting: false,
});

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useListContractsQuery,
} = templatesApi;
