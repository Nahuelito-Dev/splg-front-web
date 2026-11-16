import { env } from '../../config/env';
import { idempotencyHeaders } from './idempotency';
import { http } from './httpClient';
import type {
  CreateAdjustmentBody,
  CreateInitialCountBody,
  CreateReconciliationAdjustmentBody,
  CreateTransferBody,
  CreateWarehouseV2Body,
  Message,
  ReapplyDeliveriesResult,
  ReverseBatchBody,
  StockAdjustment,
  StockAdjustmentPage,
  StockBalance,
  StockLocation,
  StockMovement,
  StockMovementPage,
  StockOperationResult,
  StockReconciliation,
  StockSummary,
  StockThreshold,
  UpdateWarehouseV2Body,
  UpsertThresholdsBody,
  WarehouseV2,
  WarehouseV2Detail,
} from './types';

/** Una página del back de stock: `page` desde 1. */
export interface ListParams {
  page: number;
  pageSize: number;
}

const paging = ({ page, pageSize }: ListParams) => ({ page: page + 1, limit: pageSize });

/** GET /v2/warehouses: los galpones con su ubicación; los inactivos sólo con `includeInactive`. */
export const listWarehouses = async (includeInactive = false): Promise<WarehouseV2[]> => {
  const { data } = await http.get<WarehouseV2[]>('/warehouses', { params: { includeInactive }, baseURL: env.apiUrlV2 });
  return data;
};

/** GET /v2/warehouses/:id: la ficha con la ubicación y los saldos por garrafa y condición. */
export const getWarehouse = async (id: string): Promise<WarehouseV2Detail> => {
  const { data } = await http.get<WarehouseV2Detail>(`/warehouses/${id}`, { baseURL: env.apiUrlV2 });
  return data;
};

/** POST /v2/warehouses: `latitude` y `longitude` van las dos o ninguna. */
export const createWarehouse = async (body: CreateWarehouseV2Body): Promise<WarehouseV2> => {
  const { data } = await http.post<WarehouseV2>('/warehouses', body, { baseURL: env.apiUrlV2 });
  return data;
};

/**
 * `address: null` borra la dirección (el back acepta null en el PATCH aunque el Swagger no lo declare); `latitude` y
 * `longitude` en null, las dos juntas, borran la ubicación.
 */
export type WarehousePatch = Partial<Omit<UpdateWarehouseV2Body, 'address'>> & { address?: string | null };

/** PATCH /v2/warehouses/:id: editar (también la ubicación), marcar predeterminado (`isDefault`) o dar de alta/baja (`isActive`). */
export const updateWarehouse = async (id: string, body: WarehousePatch): Promise<WarehouseV2> => {
  const { data } = await http.patch<WarehouseV2>(`/warehouses/${id}`, body, { baseURL: env.apiUrlV2 });
  return data;
};

/** DELETE /warehouses/:id: baja lógica. */
export const deleteWarehouse = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/warehouses/${id}`);
  return data;
};

/** GET /stock/summary: por garrafa, lo físico en galpones y camiones, lo reservado y lo vendible. */
export const getStockSummary = async (): Promise<StockSummary[]> => {
  const { data } = await http.get<StockSummary[]>('/stock/summary');
  return data;
};

export interface BalanceFilters {
  locationId?: string;
  warehouseId?: string;
  carId?: string;
  gasCylinderId?: string;
  includeZero?: boolean;
}

/** GET /stock: saldos por ubicación, garrafa y condición. */
export const listStockBalances = async (filters: BalanceFilters = {}): Promise<StockBalance[]> => {
  const { data } = await http.get<StockBalance[]>('/stock', { params: filters });
  return data;
};

/** GET /stock/locations */
export const listStockLocations = async (): Promise<StockLocation[]> => {
  const { data } = await http.get<StockLocation[]>('/stock/locations');
  return data;
};

export interface MovementFilters {
  from?: string;
  to?: string;
  reason?: StockMovement['reason'];
  locationId?: string;
  gasCylinderId?: string;
  referenceType?: StockMovement['referenceType'];
  batchId?: string;
  /** En un contraasiento, el lote que corrige. */
  referenceId?: string;
}

/** Los parámetros de GET /stock/movements sin paginar: los mismos que usa el exporte completo. */
export const stockMovementQuery = (filters: MovementFilters) => ({ ...filters });

/** GET /stock/movements: el libro, del más nuevo al más viejo. */
export const listStockMovements = async (params: ListParams, filters: MovementFilters): Promise<StockMovementPage> => {
  const { data } = await http.get<StockMovementPage>('/stock/movements', {
    params: { ...paging(params), ...stockMovementQuery(filters) },
  });
  return data;
};

/** POST /stock/transfers */
export const createTransfer = async (body: CreateTransferBody, key: string): Promise<StockOperationResult> => {
  const { data } = await http.post<StockOperationResult>('/stock/transfers', body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** POST /stock/movements/batches/:batchId/reverse: el contraasiento de un lote. */
export const reverseBatch = async (
  batchId: string,
  body: ReverseBatchBody,
  key: string,
): Promise<StockOperationResult> => {
  const { data } = await http.post<StockOperationResult>(`/stock/movements/batches/${batchId}/reverse`, body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** POST /stock/initial-counts */
export const createInitialCount = async (body: CreateInitialCountBody, key: string): Promise<StockAdjustment> => {
  const { data } = await http.post<StockAdjustment>('/stock/initial-counts', body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

export interface AdjustmentFilters {
  reason?: StockAdjustment['reason'];
  from?: string;
  to?: string;
}

/** GET /stock/adjustments */
export const listAdjustments = async (params: ListParams, filters: AdjustmentFilters): Promise<StockAdjustmentPage> => {
  const { data } = await http.get<StockAdjustmentPage>('/stock/adjustments', {
    params: { ...paging(params), ...filters },
  });
  return data;
};

/** GET /stock/adjustments/:id */
export const getAdjustment = async (id: string): Promise<StockAdjustment> => {
  const { data } = await http.get<StockAdjustment>(`/stock/adjustments/${id}`);
  return data;
};

/** POST /stock/adjustments */
export const createAdjustment = async (body: CreateAdjustmentBody, key: string): Promise<StockAdjustment> => {
  const { data } = await http.post<StockAdjustment>('/stock/adjustments', body, { headers: idempotencyHeaders(key) });
  return data;
};

/** GET /stock/thresholds */
export const listThresholds = async (): Promise<StockThreshold[]> => {
  const { data } = await http.get<StockThreshold[]>('/stock/thresholds');
  return data;
};

/** PUT /stock/thresholds: 0 desactiva el aviso de ese par. */
export const upsertThresholds = async (body: UpsertThresholdsBody): Promise<StockThreshold[]> => {
  const { data } = await http.put<StockThreshold[]>('/stock/thresholds', body);
  return data;
};

/** GET /stock/reconciliation */
export const getReconciliation = async (): Promise<StockReconciliation> => {
  const { data } = await http.get<StockReconciliation>('/stock/reconciliation');
  return data;
};

/** POST /stock/reconciliation/adjustments: corrige sólo el vendible. */
export const createReconciliationAdjustment = async (
  body: CreateReconciliationAdjustmentBody,
  key: string,
): Promise<StockAdjustment> => {
  const { data } = await http.post<StockAdjustment>('/stock/reconciliation/adjustments', body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** POST /stock/reconciliation/reapply-deliveries */
export const reapplyDeliveries = async (key: string): Promise<ReapplyDeliveriesResult> => {
  const { data } = await http.post<ReapplyDeliveriesResult>('/stock/reconciliation/reapply-deliveries', undefined, {
    headers: idempotencyHeaders(key),
  });
  return data;
};
