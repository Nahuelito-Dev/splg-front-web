import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { FirebaseAuth } from '../firebase/config';
import { errorMessage } from '../services/api/errors';
import { getAdmin } from '../services/api/auth';
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
        queryClient.clear();
        dispatch(logOut({}));
        return;
      }

      void (async () => {
        try {
          const token = await user.getIdToken();
          // Vital para el interceptor: sin esto, la llamada a getAdmin se rechaza.
          localStorage.setItem('token', token);

          const { uid, email, displayName } = user;
          const { fullName, role } = await getAdmin(email ?? '');

          const payload: LoginPayload = { uid, email, displayName, fullName, role };
          dispatch(login(payload));
        } catch (error) {
          dispatch(logOut({ errorMessage: errorMessage(error) }));
        }
      })();
    });

    return unsubscribe;
  }, [dispatch]);

  return { status };
};
