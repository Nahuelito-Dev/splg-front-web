import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getRecoveryCase,
  getRecoveryCustomerScore,
  getRecoveryReport,
  getRecoverySettings,
  listRecoveryCases,
  patchRecoverySettings,
  resolveRecoveryCase,
  runRecovery,
  type RecoveryCaseFilters,
  type ResolveRecoveryBody,
} from '../api/recovery';
import type { PatchRecoverySettingsBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cylinderRecovery;

interface Options {
  enabled?: boolean;
}

/** Los casos de recupero de envases, paginados, con los totales por estado. */
export const useRecoveryCases = (
  pagination: { page: number; pageSize: number },
  filters: RecoveryCaseFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ ...pagination, ...filters }),
    queryFn: () => listRecoveryCases(pagination, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** El legajo de un caso. */
export const useRecoveryCase = (id: string | undefined) =>
  useQuery({ queryKey: keys.detail(`case:${id}`), queryFn: () => getRecoveryCase(id ?? ''), enabled: Boolean(id) });

/** El puntaje de riesgo de recupero de un cliente (M5). */
export const useRecoveryCustomerScore = (customerId: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`score:${customerId}`),
    queryFn: () => getRecoveryCustomerScore(customerId ?? ''),
    enabled: Boolean(customerId),
  });

export const useRecoveryReport = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('report'), queryFn: getRecoveryReport, enabled });

export const useRecoverySettings = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('settings'), queryFn: getRecoverySettings, enabled });

export const useUpdateRecoverySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchRecoverySettingsBody) => patchRecoverySettings(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(keys.detail('settings'), saved);
      return queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
};

/**
 * Correr el proceso o decidir un caso cambia casos, avisos y reporte. Decidir una baja además cambia el envase
 * (queda dado de baja), así que se refresca también lo de Envases.
 */
const refresh = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cylinders.all }),
  ]);

const useRefreshing = <V, R>(mutationFn: (variables: V) => Promise<R>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => refresh(queryClient),
    // Si la API rechazó la acción (el envase ya volvió, el caso ya se cerró) lo que se ve quedó viejo.
    onError: () => refresh(queryClient),
  });
};

export const useRunRecovery = () => useRefreshing(() => runRecovery());

export const useResolveRecoveryCase = () =>
  useRefreshing(({ id, body }: { id: string; body: ResolveRecoveryBody }) => resolveRecoveryCase(id, body));
