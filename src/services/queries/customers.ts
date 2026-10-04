import { keepPreviousData } from '@tanstack/react-query';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerByUserId,
  listCustomers,
  updateCustomerLocation,
  type CustomerStatus,
} from '../api/customers';
import type { AccountFields } from '../api/registration';
import type { PageParams } from '../api/httpClient';
import { listCustomerOrders } from '../api/orders';
import { updateUserAccount } from '../api/users';
import type { UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.customers;

export const useCustomers = (params: PageParams, search: string, status?: CustomerStatus) =>
  useQuery({
    queryKey: keys.list({ ...params, search, status }),
    queryFn: () => listCustomers(params, search, status),
    placeholderData: keepPreviousData,
  });

/**
 * Cuántos clientes hay en cada segmento (con la búsqueda aplicada): el `total` real de la API con una página mínima
 * por estado. Un segmento sin dato (cargando o con error) queda en `null`, nunca en 0.
 */
export const useCustomerStatusCounts = (search: string) => {
  const ONE: PageParams = { page: 0, pageSize: 1 };
  const statuses: (CustomerStatus | undefined)[] = [undefined, 'active', 'blocked'];
  const results = useQueries({
    queries: statuses.map((status) => ({
      queryKey: keys.list({ counts: status ?? 'all', search }),
      queryFn: () => listCustomers(ONE, search, status).then((page) => page.total),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    })),
  });
  const [all, active, blocked] = results.map((result) => result.data ?? null);
  return { all: all ?? null, active: active ?? null, blocked: blocked ?? null };
};

export const useCustomer = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getCustomer(id ?? ''),
    enabled: Boolean(id),
  });

/** El historial de pedidos de un cliente (por su user_id). */
export const useCustomerOrders = (userId: string | undefined, params: PageParams) =>
  useQuery({
    queryKey: [...queryKeys.orders.lists(), { customer: userId, ...params }],
    queryFn: () => listCustomerOrders(userId ?? '', params),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account: AccountFields) => createCustomer(account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Datos de la cuenta del cliente (nombre, teléfono, contraseña). */
export const useUpdateCustomerAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserBody }) =>
      updateUserAccount(userId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-094: corrige la última ubicación conocida del cliente. */
export const useUpdateCustomerLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, latLng }: { id: string; latLng: string }) => updateCustomerLocation(id, latLng),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/**
 * CU-130: resuelve el cliente a partir de un `user_id` (búsqueda rápida del
 * listado). Se dispara a demanda, no como una query que corre sola.
 */
export const useFindCustomerByUserId = () =>
  useMutation({ mutationFn: (userId: string) => getCustomerByUserId(userId) });

/**
 * Los últimos pedidos de un cliente (hasta 100) para los números de su portada. Sin `keepPreviousData`: al pasar de
 * una ficha a otra los KPIs no muestran datos del cliente anterior, esperan los propios.
 */
export const useCustomerOrderSample = (userId: string | undefined) =>
  useQuery({
    queryKey: [...queryKeys.orders.lists(), { customer: userId, page: 0, pageSize: 100, sample: true }],
    queryFn: () => listCustomerOrders(userId ?? '', { page: 0, pageSize: 100 }),
    enabled: Boolean(userId),
  });
