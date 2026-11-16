import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdmin,
  deleteAdmin,
  findAdminByTerm,
  getAdmin,
  listAdmins,
  updateAdmin,
  type AdminAccountFields,
  type AdminRole,
} from '../api/admins';
import type { UpdateAdminBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.admins;

export const useAdmins = (distributorId?: string) =>
  useQuery({
    queryKey: distributorId ? [...keys.all, 'distributor', distributorId] : keys.all,
    queryFn: () => listAdmins(distributorId),
  });

export const useAdmin = (id: string | undefined) =>
  useQuery({ queryKey: keys.detail(id ?? ''), queryFn: () => getAdmin(id ?? ''), enabled: Boolean(id) });

/** CU-088: busca un admin puntual por id o correo. 404 si no hay ninguno con ese término. */
export const useFindAdminByTerm = (term: string) =>
  useQuery({
    queryKey: [...keys.all, 'term', term],
    queryFn: () => findAdminByTerm(term),
    enabled: term.trim().length >= 3,
    retry: false,
  });

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, account }: { role: AdminRole; account: AdminAccountFields }) => createAdmin(role, account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdminBody }) => updateAdmin(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    // La ficha del dado de baja ya no existe: se saca del caché antes de invalidar para que no se vuelva a pedir (404).
    onSuccess: (_message, id) => {
      queryClient.removeQueries({ queryKey: keys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
};
