'use client';

import { loadSession } from '@aletheia/frontend-commons';
import { type ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import type { Privilege } from '../data/roles';
import { loginWithSession, setHydrated } from './authSlice';
import { type AppStore, makeStore } from './store';

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Hidrata la sesión real persistida (commons: cookie + localStorage) tras montar en cliente.
  // Despacha SIEMPRE setHydrated (haya o no sesión) para que el host pueda decidir entre
  // login y dashboard sin parpadear durante la hidratación al volver de un microfrontend.
  useEffect(() => {
    const session = loadSession();
    if (session) {
      storeRef.current?.dispatch(
        loginWithSession({
          role: session.role,
          privileges: session.privileges as Privilege[],
        }),
      );
    } else {
      storeRef.current?.dispatch(setHydrated());
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
