import { idempotencyHeaders } from './idempotency';
import { http } from './httpClient';
import type { ListParams } from './stock';
import type {
  CancelTruckLoadBody,
  CloseTruckLoadBody,
  CreateTruckLoadBody,
  ReloadTruckLoadBody,
  ReturnTruckLoadBody,
  StockControlSettingsBody,
  TruckLoad,
  TruckLoadPage,
  TruckStock,
  UpdateTruckLoadItemsBody,
} from './types';

export interface TruckLoadFilters {
  status?: TruckLoad['status'];
  /** Un día de negocio (AAAA-MM-DD). */
  date?: string;
  from?: string;
  to?: string;
  carId?: string;
  deliveryId?: string;
}

/** GET /truck-loads */
export const listTruckLoads = async (params: ListParams, filters: TruckLoadFilters): Promise<TruckLoadPage> => {
  const { data } = await http.get<TruckLoadPage>('/truck-loads', {
    params: { page: params.page + 1, limit: params.pageSize, ...filters },
  });
  return data;
};

/** GET /truck-loads/:id: renglones, esperado, diferencias, pedidos, efectivo y movimientos. */
export const getTruckLoad = async (id: string): Promise<TruckLoad> => {
  const { data } = await http.get<TruckLoad>(`/truck-loads/${id}`);
  return data;
};

/** GET /truck-loads/cars/:carId/stock: lo que el camión tiene ahora. */
export const getTruckStock = async (carId: string): Promise<TruckStock> => {
  const { data } = await http.get<TruckStock>(`/truck-loads/cars/${carId}/stock`);
  return data;
};

/** POST /truck-loads: abre y numera; no mueve stock. */
export const createTruckLoad = async (body: CreateTruckLoadBody, key: string): Promise<TruckLoad> => {
  const { data } = await http.post<TruckLoad>('/truck-loads', body, { headers: idempotencyHeaders(key) });
  return data;
};

/** PUT /truck-loads/:id/items: sólo en `loading`. */
export const updateTruckLoadItems = async (id: string, body: UpdateTruckLoadItemsBody): Promise<TruckLoad> => {
  const { data } = await http.put<TruckLoad>(`/truck-loads/${id}/items`, body);
  return data;
};

/** PATCH /truck-loads/:id/depart: el stock pasa del galpón al camión. */
export const departTruckLoad = async (id: string, key: string): Promise<TruckLoad> => {
  const { data } = await http.patch<TruckLoad>(`/truck-loads/${id}/depart`, undefined, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** PATCH /truck-loads/:id/reload: la clave es obligatoria (repetirla suma otra vez). */
export const reloadTruckLoad = async (id: string, body: ReloadTruckLoadBody, key: string): Promise<TruckLoad> => {
  const { data } = await http.patch<TruckLoad>(`/truck-loads/${id}/reload`, body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** PATCH /truck-loads/:id/return: declarar la vuelta; 409 con pedidos en curso. */
export const returnTruckLoad = async (id: string, body: ReturnTruckLoadBody): Promise<TruckLoad> => {
  const { data } = await http.patch<TruckLoad>(`/truck-loads/${id}/return`, body);
  return data;
};

/** PATCH /truck-loads/:id/close: la rendición. */
export const closeTruckLoad = async (id: string, body: CloseTruckLoadBody, key: string): Promise<TruckLoad> => {
  const { data } = await http.patch<TruckLoad>(`/truck-loads/${id}/close`, body, { headers: idempotencyHeaders(key) });
  return data;
};

/** PATCH /truck-loads/:id/cancel: sólo en `loading`. */
export const cancelTruckLoad = async (id: string, body: CancelTruckLoadBody): Promise<TruckLoad> => {
  const { data } = await http.patch<TruckLoad>(`/truck-loads/${id}/cancel`, body);
  return data;
};

/** GET /truck-loads/settings: D5, exigir carga abierta para despachar. */
export const getStockControlSettings = async (): Promise<StockControlSettingsBody> => {
  const { data } = await http.get<StockControlSettingsBody>('/truck-loads/settings');
  return data;
};

/** PUT /truck-loads/settings */
export const updateStockControlSettings = async (body: StockControlSettingsBody): Promise<StockControlSettingsBody> => {
  const { data } = await http.put<StockControlSettingsBody>('/truck-loads/settings', body);
  return data;
};
