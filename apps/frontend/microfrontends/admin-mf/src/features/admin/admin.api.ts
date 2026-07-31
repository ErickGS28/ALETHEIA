'use client';

// Capa de datos real del microfrontend admin-mf (RTK Query sobre el API Gateway).
// Reemplaza a features/_mock/admin. El baseApi YA desempaqueta `.data`, por lo que
// los hooks reciben el payload directo. Tipos en inglés.

import { baseApi } from '@aletheia/frontend-commons';
import type { Role } from '@aletheia/frontend-commons';

// ─── Domain types (shapes del backend, ya desempaquetados) ───────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  lastName: string;
  roles: Role[];
  privileges: string[];
  areaId?: number;
  isActive: boolean;
}

export interface Area {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export type Society = Area;

export interface Apoderado {
  id: number;
  name: string;
  legalPower: string;
  isActive: boolean;
}

export interface WorkflowStage {
  id: number;
  name: string;
  order: number;
  slaHours: number;
  roleRequired: Role;
}

// ─── Payloads ────────────────────────────────────────────────────────────────
export interface CreateUserBody {
  email: string;
  name: string;
  lastName: string;
  password: string;
  roles: Role[];
  areaId?: number;
}

export type UpdateUserBody = Partial<{
  name: string;
  lastName: string;
  roles: Role[];
  areaId: number | null;
  isActive: boolean;
}>;

export interface CreateStageBody {
  name: string;
  order: number;
  slaHours: number;
  roleRequired: Role;
}

export type UpdateStageBody = Partial<CreateStageBody>;

// ─── Endpoints ───────────────────────────────────────────────────────────────
export const adminApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // Users
    listUsers: b.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: b.mutation<User, CreateUserBody>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: b.mutation<User, { id: number; body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: b.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),

    // Areas
    listAreas: b.query<Area[], void>({
      query: () => '/areas',
      providesTags: ['Area'],
    }),
    createArea: b.mutation<Area, { name: string }>({
      query: (body) => ({ url: '/areas', method: 'POST', body }),
      invalidatesTags: ['Area'],
    }),
    updateArea: b.mutation<
      Area,
      { id: number; body: Partial<{ name: string; isActive: boolean }> }
    >({
      query: ({ id, body }) => ({ url: `/areas/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Area'],
    }),

    // Societies
    listSocieties: b.query<Society[], void>({
      query: () => '/societies',
      providesTags: ['Society'],
    }),
    createSociety: b.mutation<Society, { name: string }>({
      query: (body) => ({ url: '/societies', method: 'POST', body }),
      invalidatesTags: ['Society'],
    }),
    updateSociety: b.mutation<
      Society,
      { id: number; body: Partial<{ name: string; isActive: boolean }> }
    >({
      query: ({ id, body }) => ({ url: `/societies/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Society'],
    }),

    // Apoderados
    listApoderados: b.query<Apoderado[], void>({
      query: () => '/apoderados',
      providesTags: ['Apoderado'],
    }),
    createApoderado: b.mutation<Apoderado, { name: string; legalPower: string }>({
      query: (body) => ({ url: '/apoderados', method: 'POST', body }),
      invalidatesTags: ['Apoderado'],
    }),
    updateApoderado: b.mutation<
      Apoderado,
      { id: number; body: Partial<{ name: string; legalPower: string; isActive: boolean }> }
    >({
      query: ({ id, body }) => ({ url: `/apoderados/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Apoderado'],
    }),

    // Workflow stages
    listStages: b.query<WorkflowStage[], void>({
      query: () => '/workflow/stages',
      providesTags: ['Stage'],
    }),
    createStage: b.mutation<WorkflowStage, CreateStageBody>({
      query: (body) => ({ url: '/workflow/stages', method: 'POST', body }),
      invalidatesTags: ['Stage'],
    }),
    updateStage: b.mutation<WorkflowStage, { id: number; body: UpdateStageBody }>({
      query: ({ id, body }) => ({ url: `/workflow/stages/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Stage'],
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useListAreasQuery,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useListSocietiesQuery,
  useCreateSocietyMutation,
  useUpdateSocietyMutation,
  useListApoderadosQuery,
  useCreateApoderadoMutation,
  useUpdateApoderadoMutation,
  useListStagesQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
} = adminApi;
