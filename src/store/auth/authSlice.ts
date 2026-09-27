import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** `checking`: validando la sesión contra Firebase y la API al abrir el panel. */
type AuthStatus = 'checking' | 'authenticated' | 'not-authenticated';

interface AuthState {
  status: AuthStatus;
  uid: string | null;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  photoUrl: string | null;
  /** `admin` o `super_admin`: son los únicos roles que entran al panel. */
  role: string | null;
  errorMessage: string | null;
}

export interface LoginPayload {
  uid: string | null;
  email: string | null;
  fullName: string | null;
  role: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
}

export interface LogoutPayload {
  errorMessage?: string | null;
}

const initialState: AuthState = {
  status: 'checking',
  uid: null,
  email: null,
  displayName: null,
  fullName: null,
  photoUrl: null,
  role: null,
  errorMessage: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, { payload }: PayloadAction<LoginPayload>) => {
      state.status = 'authenticated';
      state.uid = payload.uid;
      state.email = payload.email;
      state.role = payload.role;
      state.fullName = payload.fullName;
      state.displayName = payload.displayName ?? null;
      state.photoUrl = payload.photoUrl ?? null;
      state.errorMessage = null;
    },
    logOut: (state, { payload }: PayloadAction<LogoutPayload | undefined>) => {
      state.status = 'not-authenticated';
      state.uid = null;
      state.email = null;
      state.role = null;
      state.displayName = null;
      state.fullName = null;
      state.photoUrl = null;
      state.errorMessage = payload?.errorMessage ?? null;
    },
    checkingCredentials: (state) => {
      state.status = 'checking';
    },
    finishCheckingCredentials: (state) => {
      state.status = 'authenticated';
    },
  },
});

export const { login, logOut, checkingCredentials, finishCheckingCredentials } = authSlice.actions;
