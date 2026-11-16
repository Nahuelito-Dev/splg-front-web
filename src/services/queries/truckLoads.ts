import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListParams } from '../api/stock';
import {
  cancelTruckLoad,
  closeTruckLoad,
  createTruckLoad,
  departTruckLoad,
  getStockControlSettings,
  getTruckLoad,
  getTruckStock,
  listTruckLoads,
  reloadTruckLoad,
  returnTruckLoad,
  updateStockControlSettings,
  updateTruckLoadItems,
  type TruckLoadFilters,
} from '../api/truckLoads';
import type {
  CancelTruckLoadBody,
  CloseTruckLoadBody,
  CreateTruckLoadBody,
  ReloadTruckLoadBody,
  ReturnTruckLoadBody,
  StockControlSettingsBody,
  UpdateTruckLoadItemsBody,
} from '../api/types';
import { ApiError, toApiError } from '../api/errors';
import { runIntent } from './intent';
import { queryKeys } from './queryKeys';
import { invalidateStockViews } from './stock';

const keys = queryKeys.truckLoads;

export const DEPART_ALREADY_DONE = 'La salida ya estaba registrada';

interface Options {
  enabled?: boolean;
}

export const useTruckLoads = (params: ListParams, filters: TruckLoadFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.list({ ...params, ...filters }),
    queryFn: () => listTruckLoads(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useTruckLoad = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getTruckLoad(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useTruckStock = (carId: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(`stock:${carId}`),
    queryFn: () => getTruckStock(carId ?? ''),
    enabled: Boolean(carId) && enabled,
  });

export const useStockControlSettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('settings'), queryFn: getStockControlSettings, enabled });

export const useUpdateStockControlSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockControlSettingsBody) => updateStockControlSettings(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.detail('settings') }),
  });
};

export const useCreateTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: CreateTruckLoadBody; scope: string }) =>
      runIntent(queryClient, scope, body, (key) => createTruckLoad(body, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateTruckLoadItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTruckLoadItemsBody }) => updateTruckLoadItems(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDepartTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: string }) =>
      runIntent(queryClient, scope, { id }, (key) => departTruckLoad(id, key)).catch(async (error: unknown) => {
        if (toApiError(error).status !== 409) throw error;
        // 409: el back dice por qué (cancelada, devuelta...). Sólo si la carga ya salió, la salida estaba registrada
        // (el reintento de la misma salida); en cualquier otro caso se muestra el mensaje del back.
        void queryClient.invalidateQueries({ queryKey: keys.all });
        const current = await getTruckLoad(id).catch(() => null);
        if (current?.status === 'on_route') throw new ApiError(409, [DEPART_ALREADY_DONE]);
        throw error;
      }),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useReloadTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: ReloadTruckLoadBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => reloadTruckLoad(id, body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useReturnTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnTruckLoadBody }) => returnTruckLoad(id, body),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useCloseTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, scope }: { id: string; body: CloseTruckLoadBody; scope: string }) =>
      runIntent(queryClient, scope, { id, body }, (key) => closeTruckLoad(id, body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useCancelTruckLoad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelTruckLoadBody }) => cancelTruckLoad(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
