import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDistributor,
  deleteDistributor,
  getCurrentDistributor,
  listDistributors,
  updateDistributor,
} from '../api/distributors';
import type { CreateDistributorBody, UpdateDistributorBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.distributors;

export const useDistributors = () => useQuery({ queryKey: keys.all, queryFn: listDistributors });

/**
 * La empresa de la sesión. Sin "Ver como", el administrador general no tiene
 * una: no se pide (la API contestaría 404).
 */
export const useCurrentDistributor = (enabled: boolean) =>
  useQuery({
    queryKey: keys.detail('current'),
    queryFn: getCurrentDistributor,
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
  });

export const useCreateDistributor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDistributorBody) => createDistributor(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateDistributor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateDistributorBody }) => updateDistributor(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteDistributor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDistributor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
