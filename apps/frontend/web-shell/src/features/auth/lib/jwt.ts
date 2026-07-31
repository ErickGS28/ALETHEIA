import type { Privilege, Role } from '../data/roles';

// Payload del access token emitido por el auth-service (UserContext).
export interface JwtPayload {
  userId: number;
  email: string;
  roles: Role[];
  privileges: Privilege[];
  areaId?: number | null;
  iat?: number;
  exp?: number;
}

/** Decodifica el payload (segunda parte) de un JWT sin verificar la firma. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof window === 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf-8')
        : decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
              .join(''),
          );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
