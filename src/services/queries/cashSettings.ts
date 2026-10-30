import { useQuery } from '@tanstack/react-query';
import {
  getCashSettings,
  getOrderCashSettlement,
  getPendingCollections,
  settlePendingCollections,
  updateCashSettings,
} from '../api/cashSettings';
import type { SettlePendingBody, UpdateCashCollectionSettingsBody } from '../api/types';
import { useMoneyMutation } from './finance';
import { queryKeys } from './queryKeys';

interface Options {
  enabled?: boolean;
}

/** Las cajas a las que entra lo cobrado por Mercado Pago y por transferencia. */
export const useCashSettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: queryKeys.cashSettings.list({ kind: 'settings' }), queryFn: getCashSettings, enabled });

/** Cuántos cobros hay sin asentar desde el día `from` (YYYY-MM-DD). */
export const usePendingCollections = (from: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.cashSettings.list({ kind: 'pending', from }),
    queryFn: () => getPendingCollections(from),
    enabled: enabled && Boolean(from),
  });

/** A qué caja entró lo cobrado de un pedido (si fue por Mercado Pago o transferencia). */
export const useOrderCashSettlement = (orderId: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.cashSettings.detail(orderId ?? ''),
    queryFn: () => getOrderCashSettlement(orderId ?? ''),
    enabled: Boolean(orderId) && enabled,
  });

export const useUpdateCashSettings = () =>
  useMoneyMutation<UpdateCashCollectionSettingsBody, Awaited<ReturnType<typeof updateCashSettings>>>(
    () => 'cash-settings:edit',
    (body) => body,
    (body, key) => updateCashSettings(body, key),
  );

export const useSettlePendingCollections = () =>
  useMoneyMutation<SettlePendingBody, Awaited<ReturnType<typeof settlePendingCollections>>>(
    () => 'cash-settings:settle',
    (body) => body,
    (body, key) => settlePendingCollections(body, key),
  );
