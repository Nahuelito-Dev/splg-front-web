import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignStaffRole, createStaffRole, deleteStaffRole, listStaffRoles, updateStaffRole } from '../api/staffRoles';
import type { AssignStaffRoleBody, CreateStaffRoleBody, UpdateStaffRoleBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.staffRoles;

/** Los roles de la distribuidora; `enabled` en falso no los pide (p. ej. con «Cambiar rol» cerrado). */
export const useStaffRoles = (enabled = true) => useQuery({ queryKey: keys.all, queryFn: listStaffRoles, enabled });

export const useCreateStaffRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRoleBody) => createStaffRole(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateStaffRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStaffRoleBody }) => updateStaffRole(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
      // El nombre del rol se ve en Administradores y en la ficha de cada uno.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
    },
  });
};

export const useDeleteStaffRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStaffRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useAssignStaffRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adminId, body }: { adminId: string; body: AssignStaffRoleBody }) => assignStaffRole(adminId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
      void queryClient.invalidateQueries({ queryKey: keys.all });
      // Los permisos efectivos salen del rol asignado: la sesión los vuelve a leer.
      void queryClient.invalidateQueries({ queryKey: queryKeys.myPermissions.all });
    },
  });
};
