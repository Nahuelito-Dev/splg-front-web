import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmReservationDeposit, listReservations } from '../api/reservations';
import { newIdempotencyKey } from '../api/idempotency';
import { queryKeys } from './queryKeys';

const keys = queryKeys.reservations;

export const useReservations = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list(),
    queryFn: listReservations,
    enabled: options.enabled ?? true,
  });

/**
 * Confirma la seña de una reserva (en efectivo) y la asienta en una caja. Invalida reservas, pedidos y
 * todo lo que la seña mueve (cajas, movimientos, cobros sin asentar).
 */
export const useConfirmReservationDeposit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, cashBoxId }: { orderId: string; cashBoxId?: string }) =>
      confirmReservationDeposit(orderId, cashBoxId ? { cashBoxId } : {}, newIdempotencyKey()),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashBoxes.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashMovements.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cashSettings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
      ]),
  });
};
