import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGasCylinder,
  deleteGasCylinder,
  getGasCylinder,
  listGasCylinders,
  updateGasCylinder,
  updateGasCylinderStock,
} from '../api/gasCylinders';
import type { PageParams } from '../api/httpClient';
import type { CreateGasCylinderBody, UpdateGasCylinderBody, UpdateStockBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.gasCylinders;

export const useGasCylinders = (params: PageParams, search = '') =>
  useQuery({
    queryKey: keys.list({ ...params, search }),
    queryFn: () => listGasCylinders(params, search),
    placeholderData: keepPreviousData,
  });

export const useGasCylinder = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getGasCylinder(id ?? ''),
    enabled: Boolean(id),
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
    mutationFn: ({ id, body }: { id: string; body: UpdateStockBody }) => updateGasCylinderStock(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteGasCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGasCylinder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
