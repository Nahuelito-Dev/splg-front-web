import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './auth';

/** Redux guarda sólo la sesión; los datos de la API viven en React Query. */
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
