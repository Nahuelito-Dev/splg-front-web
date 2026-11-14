import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDistributor,
  deleteDistributor,
  getCurrentDistributor,
  getDistributor,
  listDistributors,
  updateDistributor,
} from '../api/distributors';
import type { CreateDistributorBody, UpdateDistributorBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.distributors;
/** Lo que cambia una empresa también cambia el listado y la ficha de la plataforma. */
const platformKeys = queryKeys.platformConsole;

/** GET /distributor es sólo del administrador general: el resto no la pide (`enabled`). */
export const useDistributors = (enabled = true) => useQuery({ queryKey: keys.all, queryFn: listDistributors, enabled });

/** La ficha de una empresa (`GET /distributor/:id`); `enabled` en `false` la apaga para quien no es administrador general. */
export const useDistributor = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getDistributor(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

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
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.all }),
      ]),
  });
};

export const useUpdateDistributor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateDistributorBody }) => updateDistributor(id, changes),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.all }),
      ]),
  });
};

export const useDeleteDistributor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDistributor(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.all }),
        queryClient.invalidateQueries({ queryKey: platformKeys.all }),
      ]),
  });
};
