import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkCoverage,
  createCoverageZone,
  deleteCoverageZone,
  listCoverageZones,
  updateCoverageZone,
  type CheckCoverageParams,
  type CreateCoverageZonePayload,
  type UpdateCoverageZonePayload,
} from '../api/coverageZones';
import { queryKeys } from './queryKeys';

const keys = queryKeys.coverageZones;

/** Todas las zonas de la distribuidora (activas e inactivas): la lista y el mapa se pintan de acá. */
export const useCoverageZones = () =>
  useQuery({
    queryKey: keys.lists(),
    queryFn: () => listCoverageZones(true),
  });

export const useCreateCoverageZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCoverageZonePayload) => createCoverageZone(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateCoverageZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateCoverageZonePayload }) =>
      updateCoverageZone(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteCoverageZone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoverageZone(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Verificación puntual (lat/lng/subtotal), sin cachear: cada consulta es un chequeo nuevo. */
export const useCheckCoverage = () =>
  useMutation({
    mutationFn: (params: CheckCoverageParams) => checkCoverage(params),
  });
