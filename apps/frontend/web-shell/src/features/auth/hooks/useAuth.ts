'use client';

import { clearSession, saveSession } from '@aletheia/frontend-commons';
import { useCallback } from 'react';
import { useLoginMutation, useLogoutMutation } from '../api/authApi';
import type { Privilege } from '../data/roles';
import { decodeJwt } from '../lib/jwt';
import { loginWithSession, logout as logoutAction } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/store';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { role, email, privileges, isAuthenticated } = useAppSelector((s) => s.auth);
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();
  const [logoutMutation] = useLogoutMutation();

  // Login real contra el backend. Decodifica el JWT para hidratar rol/privilegios/email,
  // persiste la sesión cross-zone (commons) y actualiza el store del host.
  const login = useCallback(
    async (loginEmail: string, password: string) => {
      const res = await loginMutation({ email: loginEmail, password }).unwrap();
      const payload = decodeJwt(res.accessToken);
      if (!payload) throw new Error('Token inválido');

      const primaryRole = payload.roles[0];
      const tokenPrivileges = payload.privileges?.length ? payload.privileges : res.privileges;

      saveSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        role: primaryRole,
        privileges: tokenPrivileges,
      });

      dispatch(
        loginWithSession({
          role: primaryRole,
          privileges: tokenPrivileges as Privilege[],
          email: payload.email,
        }),
      );
    },
    [dispatch, loginMutation],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Aunque el backend falle, limpiamos la sesión local igualmente.
    }
    clearSession();
    dispatch(logoutAction());
  }, [dispatch, logoutMutation]);

  const can = useCallback((p: Privilege) => privileges.includes(p), [privileges]);

  return { role, email, privileges, isAuthenticated, isLoggingIn, login, logout, can };
}
