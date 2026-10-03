import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmReservationDeposit, listReservations } from '../api/reservations';
import { queryKeys } from './queryKeys';

const keys = queryKeys.reservations;

export const useReservations = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list(),
    queryFn: listReservations,
    enabled: options.enabled ?? true,
  });

/** Confirma la seña en efectivo de una reserva. Invalida reservas y pedidos (pasa a activarse solo). */
export const useConfirmReservationDeposit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => confirmReservationDeposit(orderId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ]),
  });
};
