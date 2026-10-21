import { useCallback } from 'react';
import { startLogOut } from '../store/auth/thunks';
import { THEME_MODE_KEY } from '../theme/themeMode';
import { useAppDispatch } from './reduxHooks';

/** Si el menú lateral está reducido a íconos. */
export const NAV_MINI_KEY = 'navMini';

/** Si las tablas se ven con filas más bajas. */
export const TABLE_DENSE_KEY = 'tableDense';

/** Preferencias del dispositivo: sobreviven al cierre de sesión. */
const DEVICE_KEYS = [THEME_MODE_KEY, NAV_MINI_KEY, TABLE_DENSE_KEY];

/** Cierra la sesión. Las preferencias del dispositivo (tema, menú reducido) se guardan antes de limpiar y se vuelven a poner. */
export const useLogout = () => {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    const kept = DEVICE_KEYS.map((key) => [key, localStorage.getItem(key)] as const);
    localStorage.clear();
    kept.forEach(([key, value]) => {
      if (value !== null) localStorage.setItem(key, value);
    });
    void dispatch(startLogOut());
  }, [dispatch]);
};
