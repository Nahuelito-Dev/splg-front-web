import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listRoles, seedRoles } from '../api/role';
import { queryKeys } from './queryKeys';

const keys = queryKeys.roles;

export const useRoles = () => useQuery({ queryKey: keys.all, queryFn: listRoles });

export const useSeedRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedRoles,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
