'use client';

import { loadSession } from '@aletheia/frontend-commons';
import { type ReactNode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import type { Privilege } from '../data/roles';
import { loginWithSession } from './authSlice';
import { type AppStore, makeStore } from './store';

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Hidrata la sesión real persistida (commons: cookie + localStorage) tras montar en cliente.
  useEffect(() => {
    const session = loadSession();
    if (session) {
      storeRef.current?.dispatch(
        loginWithSession({
          role: session.role,
          privileges: session.privileges as Privilege[],
        }),
      );
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
