import { keepPreviousData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerByUserId,
  listCustomers,
  updateCustomerLocation,
} from '../api/customers';
import type { AccountFields } from '../api/registration';
import type { PageParams } from '../api/httpClient';
import { listCustomerOrders } from '../api/orders';
import { updateUserAccount } from '../api/users';
import type { UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.customers;

/** Cuántos clientes devuelve GET /customers como máximo en una página. */
export const SEGMENT_SCAN_LIMIT = 100;

export const useCustomers = (params: PageParams, search: string) =>
  useQuery({
    queryKey: keys.list({ ...params, search }),
    queryFn: () => listCustomers(params, search),
    placeholderData: keepPreviousData,
  });

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
 * Hasta 100 clientes de una vez (el máximo de la API), para segmentar por cuenta activa o bloqueada en el panel:
 * GET /customers sólo filtra por texto. `total` dice si entran todos; si no, la lista no se segmenta.
 */
export const useCustomerScan = () =>
  useQuery({
    queryKey: keys.list({ scan: true }),
    queryFn: () => listCustomers({ page: 0, pageSize: SEGMENT_SCAN_LIMIT }),
    staleTime: 30_000,
  });

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
