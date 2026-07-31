export interface UserContext {
  userId: number;
  email: string;
  roles: string[];
  privileges: string[];
  /** Área organizacional del usuario (auth.User.areaId) — usado para CONTRACT_VIEW_AREA. */
  areaId?: number | null;
}
