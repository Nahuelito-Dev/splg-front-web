import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockUser, deleteUser, getUser, listUsers, updateUserAccount } from '../api/users';
import type { PageParams } from '../api/httpClient';
import type { UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.users;

export const useUsers = (params: PageParams, search: string, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list({ ...params, search }),
    queryFn: () => listUsers(params, search),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getUser(id ?? ''),
    enabled: Boolean(id),
  });

/** Datos de la cuenta (nombre, teléfono, contraseña). Sólo el administrador general si es un cliente. */
export const useUpdateUserAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserBody }) =>
      updateUserAccount(userId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) => blockUser(userId, block),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
