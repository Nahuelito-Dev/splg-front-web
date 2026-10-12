import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createAdjustment,
  createInitialCount,
  createReconciliationAdjustment,
  createTransfer,
  createWarehouse,
  deleteWarehouse,
  getAdjustment,
  getReconciliation,
  getStockSummary,
  getWarehouse,
  listAdjustments,
  listStockBalances,
  listStockLocations,
  listStockMovements,
  listThresholds,
  listWarehouses,
  reapplyDeliveries,
  reverseBatch,
  updateWarehouse,
  upsertThresholds,
  type AdjustmentFilters,
  type BalanceFilters,
  type ListParams,
  type MovementFilters,
  type WarehousePatch,
} from '../api/stock';
import type {
  CreateAdjustmentBody,
  CreateInitialCountBody,
  CreateReconciliationAdjustmentBody,
  CreateTransferBody,
  CreateWarehouseBody,
  ReverseBatchBody,
  UpsertThresholdsBody,
} from '../api/types';
import { clearIntent } from '../api/idempotency';
import { runIntent } from './intent';
import { queryKeys } from './queryKeys';

/** Un movimiento de stock cambia saldos, vendible, cargas, órdenes y costos: se refresca todo lo que lo muestra. */
export const invalidateStockViews = (queryClient: QueryClient) =>
  Promise.all(
    [
      queryKeys.stock,
      queryKeys.warehouses,
      queryKeys.gasCylinders,
      queryKeys.truckLoads,
      queryKeys.purchaseOrders,
      queryKeys.purchaseReceipts,
      queryKeys.suppliers,
    ].map((resource) => queryClient.invalidateQueries({ queryKey: resource.all })),
  );

const keys = queryKeys.stock;

/** `enabled` en `false` apaga la consulta (administrador general sin «Ver como»: la API responde 400). */
interface Options {
  enabled?: boolean;
}

export const useWarehouses = (includeInactive = false, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.warehouses.list({ includeInactive }),
    queryFn: () => listWarehouses(includeInactive),
    enabled,
  });

export const useWarehouse = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.warehouses.detail(id ?? ''),
    queryFn: () => getWarehouse(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWarehouseBody) => createWarehouse(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all }),
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: WarehousePatch }) => updateWarehouse(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all }),
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all }),
  });
};

export const useStockSummary = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('summary'), queryFn: getStockSummary, enabled });

export const useStockBalances = (filters: BalanceFilters = {}, { enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.list({ balances: filters }), queryFn: () => listStockBalances(filters), enabled });

export const useStockLocations = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('locations'), queryFn: listStockLocations, enabled });

export const useStockMovements = (params: ListParams, filters: MovementFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.list({ movements: { ...params, ...filters } }),
    queryFn: () => listStockMovements(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/**
 * Todos los renglones de un lote del libro (hasta 100: un lote tiene a lo sumo uno por renglón de la operación).
 * `batchId` en `undefined` apaga la consulta.
 */
export const useBatchMovements = (batchId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ batch: batchId }),
    queryFn: () => listStockMovements({ page: 0, pageSize: 100 }, { batchId }),
    enabled: Boolean(batchId),
  });

/**
 * ¿Ya se contraasentó este lote? El contraasiento conserva el `referenceId` del lote original, así que se pregunta
 * por él directamente (no depende de cuántos contraasientos haya en total). `undefined` mientras carga o si falló.
 */
export const useBatchReversed = (batchId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ reversedBatch: batchId }),
    queryFn: () => listStockMovements({ page: 0, pageSize: 1 }, { reason: 'reversal', referenceId: batchId }),
    enabled: Boolean(batchId),
    select: (page) => page.total > 0,
  });

export const useAdjustments = (params: ListParams, filters: AdjustmentFilters, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.list({ adjustments: { ...params, ...filters } }),
    queryFn: () => listAdjustments(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

const COUNT_PAGE_SIZE = 100;

/** El conteo inicial de una ubicación, recorriendo las páginas hasta dar con él (la API no filtra por ubicación). */
export const findInitialCount = async (locationId: string) => {
  for (let page = 0; ; page += 1) {
    const result = await listAdjustments({ page, pageSize: COUNT_PAGE_SIZE }, { reason: 'initial_count' });
    const found = result.data.find((a) => a.location.locationId === locationId);
    if (found) return found;
    if ((page + 1) * COUNT_PAGE_SIZE >= result.total) return null;
  }
};

/** `null` si la ubicación no tiene conteo inicial; `undefined` mientras carga o si la consulta falla. */
export const useInitialCount = (locationId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ initialCount: locationId }),
    queryFn: () => findInitialCount(locationId ?? ''),
    enabled: Boolean(locationId),
  });

export const useAdjustment = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(`adjustment:${id}`),
    queryFn: () => getAdjustment(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useThresholds = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('thresholds'), queryFn: listThresholds, enabled });

export const useReconciliation = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('reconciliation'), queryFn: getReconciliation, enabled });

/** Las mutaciones que mueven stock reciben la clave de idempotencia de la intención. */
interface Keyed<T> {
  body: T;
  scope: string;
}

export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: Keyed<CreateAdjustmentBody>) =>
      runIntent(queryClient, scope, body, (key) => createAdjustment(body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useCreateInitialCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: Keyed<CreateInitialCountBody>) =>
      runIntent(queryClient, scope, body, (key) => createInitialCount(body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: Keyed<CreateTransferBody>) =>
      runIntent(queryClient, scope, body, (key) => createTransfer(body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useReverseBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, body, scope }: Keyed<ReverseBatchBody> & { batchId: string }) =>
      runIntent(queryClient, scope, { batchId, body }, (key) => reverseBatch(batchId, body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useUpsertThresholds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertThresholdsBody) => upsertThresholds(body),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

export const useCreateReconciliationAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: Keyed<CreateReconciliationAdjustmentBody>) =>
      runIntent(queryClient, scope, body, (key) => createReconciliationAdjustment(body, key)),
    onSuccess: () => invalidateStockViews(queryClient),
  });
};

/**
 * Cada pedido del usuario es una acción nueva: el cuerpo es siempre `{}` y el back guarda 24 h la respuesta de cada clave,
 * así que una clave compartida devolvería el resultado de una reaplicación anterior.
 */
export const useReapplyDeliveries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const scope = `reapply:${crypto.randomUUID()}`;
      try {
        return await runIntent(queryClient, scope, {}, (key) => reapplyDeliveries(key));
      } finally {
        clearIntent(scope);
      }
    },
    onSuccess: () => invalidateStockViews(queryClient),
  });
};
