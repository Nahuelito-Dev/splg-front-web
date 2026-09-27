import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDelivery,
  deleteDelivery,
  getDelivery,
  listActiveDeliveries,
  listDeliveries,
  setDeliveryEnabled,
  type NewDeliveryAccount,
  updateDeliveryStatus,
} from '../api/deliveries';
import { listDistributors } from '../api/distributors';
import type { PageParams } from '../api/httpClient';
import { updateUserAccount } from '../api/users';
import type { UpdateDeliveryBody, UpdateUserBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.deliveries;

export const useDeliveries = (params: PageParams, search: string, onlyActive: boolean) =>
  useQuery({
    queryKey: keys.list({ ...params, search, onlyActive }),
    queryFn: () => (onlyActive ? listActiveDeliveries(params, search) : listDeliveries(params, search)),
    placeholderData: keepPreviousData,
  });

export const useDelivery = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getDelivery(id ?? ''),
    enabled: Boolean(id),
  });

/**
 * Choferes para el select de "asignar un vehículo" (Vehículos). `GET
 * /delivery` pagina; se pide el máximo que acepta la API (100) y se expone
 * `total` para poder avisar si la distribuidora tiene más choferes de los
 * que entran en el combo.
 */
export const useDeliveryOptions = () =>
  useQuery({
    queryKey: keys.list({ options: true }),
    queryFn: () => listDeliveries({ page: 0, pageSize: 100 }, ''),
  });

/** Las distribuidoras, para que el administrador general elija dónde queda el chofer nuevo. */
export const useDistributorOptions = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.distributors.lists(),
    queryFn: listDistributors,
    enabled,
  });

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account: NewDeliveryAccount) => createDelivery(account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Datos de la cuenta del chofer (nombre, teléfono, contraseña). */
export const useUpdateDeliveryAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: UpdateUserBody }) =>
      updateUserAccount(userId, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Lo operativo del chofer: validado y activo (PATCH /delivery/:id). */
export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateDeliveryBody }) => updateDeliveryStatus(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useSetDeliveryEnabled = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => setDeliveryEnabled(id, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDelivery(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
