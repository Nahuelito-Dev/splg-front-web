import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dissolveRouteBatch,
  getRouteBatch,
  getRouteBatchSettings,
  listRouteBatches,
  patchRouteBatchSettings,
  runRouteBatches,
  type RouteBatchFilters,
} from '../api/routeBatches';
import type { PatchRouteBatchSettingsBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.routeBatches;

interface Options {
  enabled?: boolean;
}

/** Los lotes de recorrido, paginados, con el total por estado. Se refrescan solos: una oferta vence en segundos. */
export const useRouteBatches = (
  pagination: { page: number; pageSize: number },
  filters: RouteBatchFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ ...pagination, ...filters }),
    queryFn: () => listRouteBatches(pagination, filters),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
    enabled,
  });

/** Un lote con sus paradas y ofertas. */
export const useRouteBatch = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getRouteBatch(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

export const useRouteBatchSettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('settings'), queryFn: getRouteBatchSettings, enabled });

export const useUpdateRouteBatchSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchRouteBatchSettingsBody) => patchRouteBatchSettings(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('settings'), saved);
      // Los mismos parámetros se ven en «Procesos automáticos».
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.moduleConfig.all }),
      ]);
    },
  });
};

/** Armar o deshacer un lote cambia lotes, ofertas y los pedidos que M1 vuelve a ofrecer: se refresca todo. */
const useRefreshing = <V, R>(mutationFn: (variables: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ]),
  });
};

export const useRunRouteBatches = () => useRefreshing(() => runRouteBatches());

export const useDissolveRouteBatch = () => useRefreshing((id: string) => dissolveRouteBatch(id));
