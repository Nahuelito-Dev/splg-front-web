import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type {
  CashCollectionSettings,
  OrderCashSettlement,
  PendingCollections,
  SettlePending,
  SettlePendingBody,
  UpdateCashCollectionSettingsBody,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };

/** GET /v2/cash-settings: las cajas a las que entra lo cobrado por Mercado Pago y por transferencia. */
export const getCashSettings = async (): Promise<CashCollectionSettings> => {
  const { data } = await http.get<CashCollectionSettings>('/cash-settings', v2);
  return data;
};

/** PATCH /v2/cash-settings: elige las cajas (`null` quita una; lo que no viene queda como está). */
export const updateCashSettings = async (
  body: UpdateCashCollectionSettingsBody,
  key: string,
): Promise<CashCollectionSettings> => {
  const { data } = await http.patch<CashCollectionSettings>('/cash-settings', body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** GET /v2/cash-settings/pending: los cobros confirmados desde `from` que todavía no entraron a una caja. */
export const getPendingCollections = async (from: string): Promise<PendingCollections> => {
  const { data } = await http.get<PendingCollections>('/cash-settings/pending', { ...v2, params: { from } });
  return data;
};

/** POST /v2/cash-settings/settle-pending: asienta esos cobros en las cajas configuradas; repetirlo no duplica. */
export const settlePendingCollections = async (body: SettlePendingBody, key: string): Promise<SettlePending> => {
  const { data } = await http.post<SettlePending>('/cash-settings/settle-pending', body, {
    ...v2,
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** GET /v2/orders/:orderId/cash-settlement: a qué caja entró lo cobrado del pedido por Mercado Pago o transferencia. */
export const getOrderCashSettlement = async (orderId: string): Promise<OrderCashSettlement> => {
  const { data } = await http.get<OrderCashSettlement>(`/orders/${orderId}/cash-settlement`, v2);
  return data;
};
