import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCar, deleteCar, getCar, getCarByPatent, listCars, listCarsByUser, updateCar } from '../api/cars';
import type { CreateCarBody, UpdateCarBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cars;

/** La flota completa: la usa la vista global de vehículos. */
export const useCars = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.lists(),
    queryFn: listCars,
    enabled,
  });

/** Los vehículos de un chofer puntual: la usa su ficha. */
export const useCarsByUser = (userId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ userId }),
    queryFn: () => listCarsByUser(userId ?? ''),
    enabled: Boolean(userId),
  });

/** La ficha de un vehículo puntual: la usa su página de detalle. */
export const useCar = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getCar(id ?? ''),
    enabled: Boolean(id),
  });

/** El vehículo con esa patente (`null` si no hay ninguno). La usa el buscador de la flota. */
export const useCarByPatent = (patent: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`patent:${patent}`),
    queryFn: () => getCarByPatent(patent ?? ''),
    enabled: Boolean(patent),
    retry: false,
  });

export const useCreateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCarBody) => createCar(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateCarBody }) => updateCar(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
