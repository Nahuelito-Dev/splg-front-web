import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCar, deleteCar, listCars, listCarsByUser, updateCar } from '../api/cars';
import type { CreateCarBody, UpdateCarBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cars;

/** La flota completa: la usa la vista global de vehículos. */
export const useCars = () =>
  useQuery({
    queryKey: keys.lists(),
    queryFn: listCars,
  });

/** Los vehículos de un chofer puntual: la usa su ficha. */
export const useCarsByUser = (userId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ userId }),
    queryFn: () => listCarsByUser(userId ?? ''),
    enabled: Boolean(userId),
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
