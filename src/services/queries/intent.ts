import type { QueryClient } from '@tanstack/react-query';
import { ApiError, toApiError } from '../api/errors';
import { clearIntent, intentKey } from '../api/idempotency';
import { invalidateStockViews } from './stock';

export const UNCERTAIN_MESSAGE = 'No sabemos si se registró: revisá antes de reintentar';

/**
 * Corre una operación que mueve stock con la clave de su intención.
 * - Sale bien: la intención se descarta.
 * - Error sin respuesta (red, timeout): puede haberse registrado. Se refresca el stock y las entidades y el mensaje
 *   lo dice; la clave se conserva para que el reintento no duplique.
 * - 422 (la clave ya se usó con otros datos): se refresca, se descarta la intención y se muestra el mensaje del back.
 */
export const runIntent = async <T>(
  queryClient: QueryClient,
  scope: string,
  body: unknown,
  call: (key: string) => Promise<T>,
): Promise<T> => {
  try {
    const result = await call(intentKey(scope, body));
    clearIntent(scope);
    return result;
  } catch (error) {
    const api = toApiError(error);
    if (api.status === null) {
      await invalidateStockViews(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      throw new ApiError(null, [UNCERTAIN_MESSAGE]);
    }
    if (api.status === 422) {
      clearIntent(scope);
      await invalidateStockViews(queryClient);
    }
    throw error;
  }
};
