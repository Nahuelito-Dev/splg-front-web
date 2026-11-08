import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getContainerCharge, putContainerCharge, type ContainerChargeBody } from '../api/containerCharge';
import { toApiError } from '../api/errors';
import { clearIntent, intentKey } from '../api/idempotency';
import { queryKeys } from './queryKeys';

const key = queryKeys.containerCharge.all;
const SCOPE = 'container-charge';

export const useContainerCharge = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: key, queryFn: getContainerCharge, enabled });

/**
 * Guarda el interruptor. La clave de idempotencia es la de la intención: si la red corta sin respuesta, el reintento
 * con el mismo valor reusa la clave, y lo mismo ante un 5xx (el back pudo haberlo guardado); si respondió bien o lo
 * rechazó (4xx), la próxima es otra.
 */
export const useUpdateContainerCharge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ContainerChargeBody) => {
      try {
        const saved = await putContainerCharge(body, intentKey(SCOPE, body));
        clearIntent(SCOPE);
        return saved;
      } catch (error) {
        const { status } = toApiError(error);
        if (status !== null && status >= 400 && status < 500) clearIntent(SCOPE);
        throw error;
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
};
