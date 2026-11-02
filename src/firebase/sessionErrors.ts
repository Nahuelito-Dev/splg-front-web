/** Aviso del login cuando la sesión no se pudo renovar. */
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión venció, volvé a ingresar';

/** Errores del SDK que dicen que la sesión ya no sirve (usuario deshabilitado, borrado o refresh token revocado). */
const SESSION_ERROR_CODES = new Set([
  'auth/user-token-expired',
  'auth/invalid-user-token',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/requires-recent-login',
]);

/**
 * Sólo estos errores cierran la sesión. Una falla de red, `auth/too-many-requests` o
 * `auth/internal-error` no dicen nada de la cuenta: se rechaza el pedido y la sesión sigue.
 */
export const esErrorDeSesion = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && SESSION_ERROR_CODES.has((error as { code?: string }).code ?? '');

export const NO_CONNECTION_MESSAGE = 'No hay conexión. Revisá tu internet y volvé a intentar';

/** Falla de red (Firebase o fetch/axios sin respuesta): no dice nada de la cuenta. */
export const esFallaDeRed = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === 'auth/network-request-failed' ||
    code === 'ERR_NETWORK' ||
    (error instanceof TypeError && /fetch|network/i.test(message ?? ''))
  );
};
