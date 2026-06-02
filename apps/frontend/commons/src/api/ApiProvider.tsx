'use client';

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { type ReactNode, useRef } from 'react';
import { Provider } from 'react-redux';
import { baseApi } from './base-api';

/**
 * Crea un store RTK Query aislado para un microfrontend.
 * Cada MF es una app Next independiente (Multi-Zones) con su propio runtime, por lo que
 * cada uno monta su propio store con el `baseApi` compartido — no hay store global cross-zone.
 */
export const makeMfStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

export type MfStore = ReturnType<typeof makeMfStore>;

/**
 * Provider que envuelve el layout de cada microfrontend para habilitar RTK Query.
 * Uso: en `app/layout.tsx`, envolver `{children}` con `<ApiProvider>`.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<MfStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeMfStore();
    setupListeners(storeRef.current.dispatch);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
