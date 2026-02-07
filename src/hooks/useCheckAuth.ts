import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseAuth } from '../firebase/config';
import { getAdmin } from '../services/api/auth';
import { logOut, login } from '../store/auth/authSlice';
import { useAppSelector } from './reduxHooks';

export const useCheckAuth = () => {
  const { status } = useAppSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    onAuthStateChanged(FirebaseAuth, async (user) => {
      if (!user) return dispatch(logOut({}));

      try {
        // 1. EXTRAER EL TOKEN ACTUALIZADO DE FIREBASE
        const token = await user.getIdToken();
        localStorage.setItem('token', token); // ESTO ES VITAL para el interceptor

        const { uid, email, displayName } = user;

        // 2. BUSCAR PERMISOS EN NESTJS
        const userInfo = await getAdmin(email!);

        // 3. LOGUEAR EN REDUX
        dispatch(
          login({
            uid,
            email,
            displayName,
            role: userInfo.role,
            fullName: userInfo.fullName,
          }),
        );
      } catch (error) {
        console.error('Error validando admin:', error);
        dispatch(logOut({ errorMessage: 'No autorizado' }));
      }
    });
  }, [dispatch]);

  return { status };
};
