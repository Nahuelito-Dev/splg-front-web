import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGasCylinder,
  deleteGasCylinder,
  getAvailableGasCylinders,
  getGasCylinder,
  getGasCylinderByType,
  listGasCylinders,
  updateGasCylinder,
  updateGasCylinderStock,
} from '../api/gasCylinders';
import type { PageParams } from '../api/httpClient';
import type { CreateGasCylinderBody, UpdateGasCylinderBody, UpdateStockBody } from '../api/types';
import { runIntent } from './intent';
import { queryKeys } from './queryKeys';
import { invalidateStockViews } from './stock';

const keys = queryKeys.gasCylinders;

export const useGasCylinders = (params: PageParams, search = '') =>
  useQuery({
    queryKey: keys.list({ ...params, search }),
    queryFn: () => listGasCylinders(params, search),
    placeholderData: keepPreviousData,
  });

/** Todos los tipos del catálogo (con o sin stock) para el combo de filtro: una página grande, sin buscador. */
export const useGasCylinderTypes = () =>
  useQuery({
    queryKey: [...keys.all, 'types'],
    queryFn: () => listGasCylinders({ page: 0, pageSize: 100 }, ''),
  });

export const useGasCylinder = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getGasCylinder(id ?? ''),
    enabled: Boolean(id),
  });

/** El producto activo de un tipo exacto (10kg, 15kg…). 404 si no hay ninguno: no reintenta. */
export const useGasCylinderByType = (type: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`type:${type}`),
    queryFn: () => getGasCylinderByType(type ?? ''),
    enabled: Boolean(type),
    retry: false,
  });

/** Lo que la app del cliente puede pedir ahora: activo y con stock. Alimenta el filtro "Sólo disponibles". */
export const useAvailableGasCylinders = () =>
  useQuery({
    queryKey: [...keys.all, 'available'],
    queryFn: getAvailableGasCylinders,
  });

export const useCreateGasCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGasCylinderBody) => createGasCylinder(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateGasCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateGasCylinderBody }) => updateGasCylinder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateGasCylinderStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockBody }) =>
      runIntent(queryClient, `gcstock:${id}`, body, (key) => updateGasCylinderStock(id, body, key)),
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: keys.all }), invalidateStockViews(queryClient)]),
  });
};

export const useDeleteGasCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGasCylinder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
