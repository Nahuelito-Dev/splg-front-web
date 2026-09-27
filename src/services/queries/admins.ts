import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdmin, listAdmins, type AdminAccountFields, type AdminRole } from '../api/admins';
import { queryKeys } from './queryKeys';

const keys = queryKeys.admins;

export const useAdmins = () => useQuery({ queryKey: keys.all, queryFn: listAdmins });

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, account }: { role: AdminRole; account: AdminAccountFields }) => createAdmin(role, account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
