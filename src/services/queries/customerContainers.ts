import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adjustCustomerContainers,
  getCustomerContainers,
  listCustomerContainerMovements,
  type AdjustCustomerContainersBody,
} from '../api/customerContainers';
import { ApiError, toApiError } from '../api/errors';
import { clearIntent, intentKey } from '../api/idempotency';
import { queryKeys } from './queryKeys';

const keys = queryKeys.customerContainers;

export const UNCERTAIN_MESSAGE = 'No sabemos si el ajuste se guardó: reintentá; no se va a duplicar';

/** Rechazos definitivos del back: el ajuste no se guardó y el próximo intento es otra intención, con otra clave. */
const DEFINITIVE_REJECTIONS = [400, 404, 409];

interface Options {
  enabled?: boolean;
}

/** Los envases del cliente por tipo (`customerId` es el id de la ficha). */
export const useCustomerContainers = (customerId: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(customerId),
    queryFn: () => getCustomerContainers(customerId),
    enabled,
  });

/** El historial de la cuenta de envases del cliente, paginado. */
export const useCustomerContainerMovements = (
  customerId: string,
  pagination: { page: number; pageSize: number },
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ customerId, ...pagination }),
    queryFn: () => listCustomerContainerMovements(customerId, pagination),
    placeholderData: keepPreviousData,
    enabled,
  });

export interface AdjustVariables {
  customerId: string;
  body: AdjustCustomerContainersBody;
}

/** La intención de ajuste de un cliente: un reintento con los mismos datos viaja con la misma clave. */
export const adjustScope = (customerId: string) => `containers-adjustment:${customerId}`;

/**
 * Ajuste manual de envases con la clave de su intención:
 * - sale bien o el back lo rechaza en forma definitiva (400, 404, 409): la intención terminó y la próxima es otra;
 * - sin respuesta (red, timeout) o 5xx: puede haberse registrado. La clave se conserva para que el reintento no
 *   duplique y el mensaje lo dice;
 * - cualquier otro estado (401, 403, 429…): el back no lo procesó; la clave se conserva y se muestra su mensaje.
 * Pase lo que pase se refrescan la cuenta y el historial: un 409 dice que lo que se ve quedó viejo.
 */
export const useAdjustCustomerContainers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, body }: AdjustVariables) => {
      const scope = adjustScope(customerId);
      try {
        const result = await adjustCustomerContainers(customerId, body, intentKey(scope, body));
        clearIntent(scope);
        return result;
      } catch (error) {
        const api = toApiError(error);
        if (api.status === null || api.status >= 500) throw new ApiError(api.status, [UNCERTAIN_MESSAGE]);
        if (DEFINITIVE_REJECTIONS.includes(api.status)) clearIntent(scope);
        throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
