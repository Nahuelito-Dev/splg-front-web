import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listFailedVisitOrders,
  listOrderFailedVisits,
  listRevisitOptions,
  scheduleRevisit,
  type FailedVisitFilters,
} from '../api/failedVisits';
import type { RevisitChoiceBody } from '../api/types';
import { runIntent } from './intent';
import { queryKeys } from './queryKeys';

const keys = queryKeys.failedVisits;

/** Pedidos con visitas fallidas (GET /v3/failed-visits), paginado en el servidor. */
export const useFailedVisitOrders = (filters: FailedVisitFilters, enabled = true) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: () => listFailedVisitOrders(filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** El historial de visitas fallidas de un pedido (GET /v3/orders/:id/failed-visits). */
export const useOrderFailedVisits = (orderId: string | null | undefined) =>
  useQuery({
    queryKey: keys.detail(orderId ?? ''),
    queryFn: () => listOrderFailedVisits(orderId ?? ''),
    enabled: Boolean(orderId),
  });

/** Los días y franjas libres para la nueva visita; se piden al abrir el formulario (el cupo cambia). */
export const useRevisitOptions = (orderId: string | null | undefined) =>
  useQuery({
    queryKey: [...keys.detail(orderId ?? ''), 'options'],
    queryFn: () => listRevisitOptions(orderId ?? ''),
    enabled: Boolean(orderId),
    staleTime: 0,
  });

/** POST /v3/orders/:id/revisit/schedule: el admin fija el día y la franja. Refresca la lista, el historial y el pedido. */
export const useScheduleRevisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: RevisitChoiceBody }) =>
      runIntent(queryClient, `revisit-schedule:${orderId}`, body, (key) => scheduleRevisit(orderId, body, key)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ]),
  });
};
