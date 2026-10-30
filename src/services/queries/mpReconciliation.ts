import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  applyMpReconciliation,
  createMpReconciliation,
  getMpReconciliation,
  getMpReconciliationReport,
  listMpReconciliations,
  type MpReconciliationFilters,
} from '../api/mpReconciliation';
import type { ListParams } from '../api/stock';
import type { ApplyMpReconciliationBody, CreateMpReconciliationBody } from '../api/types';
import { MP_RECONCILIATION_STATUS, statusKeys } from '../../utils/statusLabels';
import { useMoneyMutation } from './finance';
import { queryKeys } from './queryKeys';
import { useStatusCounts } from './statusCounts';

interface Options {
  enabled?: boolean;
}

/** Cada cuánto se vuelve a preguntar mientras la corrida espera el reporte de Mercado Pago. */
export const WAITING_REFRESH_MS = 10_000;

export const useMpReconciliations = (
  params: ListParams,
  filters: MpReconciliationFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.mpReconciliations.list({ ...params, ...filters }),
    queryFn: () => listMpReconciliations(params, filters),
    placeholderData: keepPreviousData,
    enabled,
    // Si alguna sigue esperando el reporte, la lista se actualiza sola.
    refetchInterval: (query) =>
      query.state.data?.data.some((c) => c.status === 'requested') ? WAITING_REFRESH_MS : false,
  });

/** Cuántas conciliaciones hay en cada estado. */
export const useMpReconciliationStatusCounts = (enabled = true) =>
  useStatusCounts(
    statusKeys(MP_RECONCILIATION_STATUS),
    (status) => queryKeys.mpReconciliations.list({ counts: status }),
    (status) => listMpReconciliations({ page: 0, pageSize: 1 }, { status }).then((page) => page.total),
    enabled,
  );

/** Una corrida con sus diferencias; mientras espera el reporte se actualiza sola. */
export const useMpReconciliation = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.mpReconciliations.detail(id ?? ''),
    queryFn: () => getMpReconciliation(id ?? ''),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.status === 'requested' ? WAITING_REFRESH_MS : false),
  });

export const useCreateMpReconciliation = () =>
  useMoneyMutation<CreateMpReconciliationBody, Awaited<ReturnType<typeof createMpReconciliation>>>(
    () => 'mp-reconciliation:new',
    (body) => body,
    (body, key) => createMpReconciliation(body, key),
  );

export const useApplyMpReconciliation = () =>
  useMoneyMutation<{ id: string; body: ApplyMpReconciliationBody }, Awaited<ReturnType<typeof applyMpReconciliation>>>(
    ({ id }) => `mp-reconciliation:apply:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => applyMpReconciliation(id, body, key),
  );

/** Pide el enlace firmado del CSV del reporte (no se guarda: vence en minutos). */
export const useMpReconciliationReport = () => useMutation({ mutationFn: getMpReconciliationReport });
