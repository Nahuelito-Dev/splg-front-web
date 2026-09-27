import { keepPreviousData } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, deleteCustomer, getCustomer, listCustomers } from '../api/customers';
import type { AccountFields } from '../api/registration';
import type { PageParams } from '../api/httpClient';
import { listCustomerOrders } from '../api/orders';
import { updateUserAccount } from '../api/users';
import type { UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.customers;

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
