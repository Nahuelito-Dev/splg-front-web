import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserAddress,
  deleteUserAddress,
  listUserAddresses,
  setDefaultUserAddress,
  updateUserAddress,
} from '../api/userAddresses';
import type { CreateUserAddressBody, UpdateUserAddressBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.userAddresses;

export const useUserAddresses = (userId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ userId }),
    queryFn: () => listUserAddresses(userId ?? ''),
    enabled: Boolean(userId),
  });

/**
 * El conteo de direcciones de un cliente también sale de `GET /customers`
 * (`user.addresses`), así que toda mutación invalida los dos recursos para
 * que la columna del listado y la ficha no queden desincronizadas.
 */
const invalidateAddresses = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: keys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
};

export const useCreateUserAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserAddressBody) => createUserAddress(body),
    onSuccess: () => invalidateAddresses(queryClient),
  });
};

export const useUpdateUserAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, body }: { addressId: string; body: UpdateUserAddressBody }) =>
      updateUserAddress(addressId, body),
    onSuccess: () => invalidateAddresses(queryClient),
  });
};

export const useSetDefaultUserAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => setDefaultUserAddress(addressId),
    onSuccess: () => invalidateAddresses(queryClient),
  });
};

export const useDeleteUserAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => deleteUserAddress(addressId),
    onSuccess: () => invalidateAddresses(queryClient),
  });
};
