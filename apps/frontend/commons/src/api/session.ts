'use client';

// Sesión cross-zone para SOFEA/Multi-Zones: los microfrontends NO comparten el store
// Redux del host, así que el token y el rol viajan por COOKIE legible (+ localStorage como
// respaldo en el host). El web-shell escribe la sesión en el login; los MFs la leen.

import type { Role } from '../auth/roles';

const TOKEN_COOKIE = 'aletheia_token';
const REFRESH_COOKIE = 'aletheia_refresh';
const ROLE_COOKIE = 'aletheia_role'; // ya usado por useRole()
const LS_KEY = 'aletheia_session';

export interface Session {
  accessToken: string;
  refreshToken: string;
  role: Role;
  privileges: string[];
}

function setCookie(name: string, value: string, maxAgeSec = 86400) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

function delCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Guarda la sesión tras un login/refresh exitoso. */
export function saveSession(s: Session) {
  setCookie(TOKEN_COOKIE, s.accessToken);
  setCookie(REFRESH_COOKIE, s.refreshToken, 7 * 86400);
  setCookie(ROLE_COOKIE, s.role);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }
}

/** Actualiza solo el access token (tras /auth/refresh). */
export function updateAccessToken(accessToken: string) {
  setCookie(TOKEN_COOKIE, accessToken);
}

export function clearSession() {
  delCookie(TOKEN_COOKIE);
  delCookie(REFRESH_COOKIE);
  delCookie(ROLE_COOKIE);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem('aletheia_auth'); // legado del login mock
    } catch {
      /* ignore */
    }
  }
}

export const getAccessToken = () => readCookie(TOKEN_COOKIE);
export const getRefreshToken = () => readCookie(REFRESH_COOKIE);

/** Lee la sesión completa (localStorage del host; en MFs solo habrá cookies). */
export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch {
    /* ignore */
  }
  const token = getAccessToken();
  const role = readCookie(ROLE_COOKIE) as Role | null;
  if (token && role)
    return { accessToken: token, refreshToken: getRefreshToken() ?? '', role, privileges: [] };
  return null;
}

export const isAuthenticated = () => !!getAccessToken();
