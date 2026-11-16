import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkCoverage,
  createCoverageZone,
  deleteCoverageZone,
  getCoverageZone,
  listCoverageZones,
  updateCoverageZone,
  type CheckCoverageParams,
  type CreateCoverageZonePayload,
  type UpdateCoverageZonePayload,
} from '../api/coverageZones';
import { queryKeys } from './queryKeys';

const keys = queryKeys.coverageZones;

/** Todas las zonas de la distribuidora (activas e inactivas): la lista y el mapa se pintan de acá. */
/** `enabled` en `false` la apaga (un super_admin sin «Ver como»: la API responde 400). */
export const useCoverageZones = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.lists(),
    queryFn: () => listCoverageZones(true),
    enabled: options.enabled ?? true,
  });

/** El detalle de una zona (`GET /coverage-zones/:id`), para el panel lateral del mapa. */
export const useCoverageZone = (id: string | null) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getCoverageZone(id ?? ''),
    enabled: Boolean(id),
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
