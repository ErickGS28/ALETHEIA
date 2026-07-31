'use client';

import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import { clearSession, getAccessToken, getRefreshToken, updateAccessToken } from './session';

/** Base URL del API Gateway. Por defecto 3001 (Grafana ocupa 3000 en local). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * baseQuery con dos responsabilidades transversales (para que ningún endpoint las repita):
 *  1. Re-auth: ante 401, intenta /auth/refresh una vez y reintenta; si falla, limpia sesión
 *     y manda al login del host.
 *  2. Unwrap: el gateway envuelve toda respuesta en `{ data, statusCode, message }`
 *     (TransformInterceptor). Aquí se desempaqueta `.data` para que los hooks reciban el payload.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refresh = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        api,
        extraOptions,
      );
      const newToken = (refresh.data as { data?: { accessToken?: string } } | undefined)?.data
        ?.accessToken;
      if (newToken) {
        updateAccessToken(newToken);
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        clearSession();
        if (typeof window !== 'undefined') window.location.href = '/';
      }
    } else {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  }

  // Unwrap del envoltorio { data, statusCode, message } del gateway.
  if (result.data && typeof result.data === 'object' && 'data' in result.data) {
    return { ...result, data: (result.data as { data: unknown }).data };
  }
  return result;
};

/**
 * API base de RTK Query compartida por todos los microfrontends.
 * Cada MF agrega sus endpoints con `baseApi.injectEndpoints({ ... })` y consume los hooks
 * autogenerados. tagTypes habilita invalidación de caché entre queries y mutations.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Contract',
    'Workflow',
    'Document',
    'Signature',
    'Notification',
    'User',
    'Society',
    'Area',
    'Apoderado',
    'Template',
    'Stage',
    'Report',
  ],
  endpoints: () => ({}),
});
