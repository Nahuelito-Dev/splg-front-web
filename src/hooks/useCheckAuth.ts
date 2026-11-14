import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { FirebaseAuth } from '../firebase/config';
import {
  esErrorDeSesion,
  esFallaDeRed,
  NO_CONNECTION_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from '../firebase/sessionErrors';
import { store } from '../store/store';
import { errorMessage } from '../services/api/errors';
import { getAdmin } from '../services/api/auth';
import { ownedCompany } from '../services/api/ownedCompany';
import { queryClient } from '../services/queries/queryClient';
import { login, logOut, type LoginPayload } from '../store/auth/authSlice';
import { useAppDispatch, useAppSelector } from './reduxHooks';

/**
 * Sincroniza la sesión con Firebase: si hay usuario, valida contra la API que
 * tenga rol de administrador antes de dejarlo entrar al panel.
 */
export const useCheckAuth = () => {
  const { status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FirebaseAuth, (user) => {
      if (!user) {
        // Había sesión guardada y Firebase ya no tiene usuario: venció o se revocó. Sin token guardado es un primer ingreso.
        const hadSession = localStorage.getItem('token') !== null;
        localStorage.removeItem('token');
        queryClient.clear();
        // Sin usuario no hay a quién atar la empresa propia elegida.
        ownedCompany.syncIdentity(null);
        // Si el cierre ya lo despachó otro (401 del interceptor, logout voluntario), no se pisa su aviso.
        if (store.getState().auth.status === 'not-authenticated') return;
        dispatch(logOut(hadSession ? { errorMessage: SESSION_EXPIRED_MESSAGE } : {}));
        return;
      }

      void (async () => {
        try {
          // Firebase renueva el token vencido con su refresh token; si no puede, la sesión terminó.
          let token: string;
          try {
            token = await user.getIdToken();
          } catch (error) {
            if (!esErrorDeSesion(error)) throw error;
            localStorage.removeItem('token');
            ownedCompany.syncIdentity(null);
            dispatch(logOut({ errorMessage: SESSION_EXPIRED_MESSAGE }));
            return;
          }
          // Vital para el interceptor: sin esto, la llamada a getAdmin se rechaza.
          localStorage.setItem('token', token);

          const { uid, email, displayName } = user;
          // Lo elegido por otra cuenta en este navegador se borra antes de la primera request de esta.
          ownedCompany.syncIdentity(uid);
          const { fullName, role } = await getAdmin(email ?? '');

          const payload: LoginPayload = { uid, email, displayName, fullName, role };
          dispatch(login(payload));
        } catch (error) {
          ownedCompany.syncIdentity(null);
          dispatch(logOut({ errorMessage: esFallaDeRed(error) ? NO_CONNECTION_MESSAGE : errorMessage(error) }));
        }
      })();
    });

    return unsubscribe;
  }, [dispatch]);

  return { status };
};
