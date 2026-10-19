import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDelivery,
  deleteDelivery,
  getDelivery,
  getDeliveryByUserId,
  invalidateDelivery,
  listActiveDeliveries,
  listDeliveries,
  setDeliveryEnabled,
  toggleDeliveryAvailability,
  updateDeliveryBalance,
  validateDelivery,
  type DeliveryStatusFilter,
  type NewDeliveryAccount,
} from '../api/deliveries';
import { listDistributors } from '../api/distributors';
import type { PageParams } from '../api/httpClient';
import { listDeliveryOrders } from '../api/orders';
import { updateUserAccount } from '../api/users';
import type { UpdateUserBody } from '../api/types';
import { SKIP } from '../../utils/batch';
import { useBatchMutation } from './batchMutation';
import { queryKeys } from './queryKeys';

const keys = queryKeys.deliveries;

/** Los grupos del listado: los cuatro administrativos de la API más "todos" y "en línea" (endpoint dedicado). */
export type DeliveriesStatusTab = 'all' | 'online' | DeliveryStatusFilter;

export const useDeliveries = (params: PageParams, search: string, statusTab: DeliveriesStatusTab) =>
  useQuery({
    queryKey: keys.list({ ...params, search, statusTab }),
    queryFn: () =>
      statusTab === 'online'
        ? listActiveDeliveries(params, search)
        : listDeliveries(params, search, statusTab === 'all' ? undefined : statusTab),
    placeholderData: keepPreviousData,
  });

const DELIVERY_TABS: DeliveriesStatusTab[] = ['all', 'unvalidated', 'enabled', 'disabled', 'online'];

/**
 * Cuántos choferes hay en cada grupo de la lista: una página mínima por grupo, leyendo `X-Total-Count`. Un grupo
 * sin dato (cargando o con error) queda en `null`, nunca en 0.
 */
export const useDeliveryStatusCounts = (search = '') => {
  const results = useQueries({
    queries: DELIVERY_TABS.map((tab) => ({
      queryKey: keys.list({ page: 0, pageSize: 1, search, statusTab: tab, counts: true }),
      queryFn: () =>
        (tab === 'online'
          ? listActiveDeliveries({ page: 0, pageSize: 1 }, search)
          : listDeliveries({ page: 0, pageSize: 1 }, search, tab === 'all' ? undefined : tab)
        ).then((page) => page.total),
      staleTime: 30_000,
    })),
  });
  return Object.fromEntries(DELIVERY_TABS.map((tab, index) => [tab, results[index].data ?? null])) as Record<
    DeliveriesStatusTab,
    number | null
  >;
};

export const useDelivery = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getDelivery(id ?? ''),
    enabled: Boolean(id),
  });

/**
 * Choferes para el select de "asignar un vehículo" (Vehículos). `GET
 * /delivery` pagina; se pide el máximo que acepta la API (100) y se expone
 * `total` para poder avisar si la distribuidora tiene más choferes de los
 * que entran en el combo.
 */
export const useDeliveryOptions = () =>
  useQuery({
    queryKey: keys.list({ options: true }),
    queryFn: () => listDeliveries({ page: 0, pageSize: 100 }, ''),
  });

/** Las distribuidoras, para que el administrador general elija dónde queda el chofer nuevo. */
export const useDistributorOptions = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.distributors.lists(),
    queryFn: listDistributors,
    enabled,
  });

/** El historial de pedidos de un chofer (CU-081). */
export const useDeliveryOrders = (deliveryId: string | undefined, params: PageParams) =>
  useQuery({
    queryKey: [...queryKeys.orders.lists(), { delivery: deliveryId, ...params }],
    queryFn: () => listDeliveryOrders(deliveryId ?? '', params),
    enabled: Boolean(deliveryId),
    placeholderData: keepPreviousData,
  });

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account: NewDeliveryAccount) => createDelivery(account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Datos de la cuenta del chofer (nombre, teléfono, contraseña). */
export const useUpdateDeliveryAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserBody }) =>
      updateUserAccount(userId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-032: marca al chofer como validado por la distribuidora. */
export const useValidateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => validateDelivery(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-032: le retira la marca de validado. */
export const useInvalidateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invalidateDelivery(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/**
 * Validar o retirar la validación de varios choferes: una llamada por chofer, de a una. Antes de cada una se vuelve
 * a pedir el chofer: si ya está en el estado pedido se omite en vez de contarlo como falla.
 */
export const useBulkValidateDeliveries = () =>
  useBatchMutation<{ ids: string[]; validated: boolean }>({
    run: async ({ validated }, id) => {
      if ((await getDelivery(id)).validated === validated) return SKIP;
      return validated ? validateDelivery(id) : invalidateDelivery(id);
    },
    invalidate: keys.all,
    noun: ['chofer', 'choferes'],
    participle: ['actualizado', 'actualizados'],
  });

export const useSetDeliveryEnabled = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => setDeliveryEnabled(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Fuerza la disponibilidad del chofer (en línea/desconectado) desde el panel. */
export const useToggleDeliveryAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, available }: { userId: string; available: boolean }) =>
      toggleDeliveryAvailability(userId, available),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-049: ajuste manual del saldo (positivo acredita, negativo descuenta). */
export const useUpdateDeliveryBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => updateDeliveryBalance(id, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDelivery(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/**
 * CU-110: resuelve el chofer a partir de un `user_id` (búsqueda rápida del
 * listado). Se dispara a demanda, no como una query que corre sola.
 */
export const useFindDeliveryByUserId = () =>
  useMutation({ mutationFn: (userId: string) => getDeliveryByUserId(userId) });
