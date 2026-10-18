import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listOrderRefunds, listRefunds, retryOrderRefunds, type RefundFilters } from '../api/refunds';
import { queryKeys } from './queryKeys';

const keys = queryKeys.refunds;

export const useRefunds = (params: { page: number; pageSize: number }, filters: RefundFilters = {}) =>
  useQuery({
    queryKey: keys.list({ ...params, ...filters }),
    queryFn: () => listRefunds(params, filters),
    placeholderData: keepPreviousData,
  });

/** Las devoluciones de un pedido; `enabled` evita pedirlas cuando el pedido no pudo tener ninguna. */
export const useOrderRefunds = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(orderId ?? ''),
    queryFn: () => listOrderRefunds(orderId ?? ''),
    enabled: enabled && Boolean(orderId),
  });

export const useRetryOrderRefunds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => retryOrderRefunds(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
