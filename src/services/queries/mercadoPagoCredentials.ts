import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deactivateMercadoPagoCredentials,
  getMercadoPagoCredentials,
  putMercadoPagoCredentials,
} from '../api/mercadoPagoCredentials';
import type { SaveMercadoPagoCredentialsBody } from '../api/types';
import { queryKeys } from './queryKeys';

const key = queryKeys.mercadoPagoCredentials.all;

export const useMercadoPagoCredentials = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: key, queryFn: getMercadoPagoCredentials, enabled });

export const useSaveMercadoPagoCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveMercadoPagoCredentialsBody) => putMercadoPagoCredentials(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
};

export const useDeactivateMercadoPagoCredentials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateMercadoPagoCredentials,
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
};
