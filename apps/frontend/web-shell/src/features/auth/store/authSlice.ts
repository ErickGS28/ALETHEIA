import { type PayloadAction, createSlice } from '@reduxjs/toolkit';
import { type Privilege, ROLE_PRIVILEGES, type Role } from '../data/roles';

export interface AuthState {
  role: Role | null;
  email: string | null;
  privileges: Privilege[];
  isAuthenticated: boolean;
}

export interface SessionPayload {
  role: Role;
  privileges: Privilege[];
  email?: string | null;
}

const initialState: AuthState = {
  role: null,
  email: null,
  privileges: [],
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login mock (legado, basado solo en rol). Se mantiene por compatibilidad.
    loginAs(state, action: PayloadAction<Role>) {
      state.role = action.payload;
      state.email = null;
      state.privileges = ROLE_PRIVILEGES[action.payload];
      state.isAuthenticated = true;
    },
    // Login real: hidrata el host con la sesión decodificada del JWT.
    loginWithSession(state, action: PayloadAction<SessionPayload>) {
      state.role = action.payload.role;
      state.email = action.payload.email ?? null;
      // Usa los privilegios del token; si vienen vacíos, cae a la matriz del rol.
      state.privileges =
        action.payload.privileges.length > 0
          ? action.payload.privileges
          : ROLE_PRIVILEGES[action.payload.role];
      state.isAuthenticated = true;
    },
    logout(state) {
      state.role = null;
      state.email = null;
      state.privileges = [];
      state.isAuthenticated = false;
    },
  },
});

export const { loginAs, loginWithSession, logout } = authSlice.actions;
export default authSlice.reducer;
