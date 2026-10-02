import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRole, deleteRole, getRole, listRoles, seedRoles, updateRole } from '../api/role';
import type { CreateRoleBody, UpdateRoleBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.roles;

export const useRoles = () => useQuery({ queryKey: keys.all, queryFn: listRoles });

export const useRole = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getRole(id ?? ''),
    enabled: Boolean(id),
  });

export const useSeedRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedRoles,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-089: alta de un rol fuera de los cuatro del sistema. */
export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleBody) => createRole(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-089: edición de un rol personalizado. */
export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleBody }) => updateRole(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-089: baja de un rol personalizado. Falla si tiene usuarios asignados. */
export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
