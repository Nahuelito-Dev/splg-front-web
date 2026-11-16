import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClaim,
  getClaim,
  listClaims,
  listOrderClaims,
  reopenClaim,
  resolveClaim,
  takeClaim,
  updateClaim,
} from '../api/claims';
import type { CreateClaimBody, ReopenClaimBody, ResolveClaimBody, UpdateClaimBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.claims;

export const useClaims = ({ refetchInterval }: { refetchInterval?: number } = {}) =>
  useQuery({ queryKey: keys.all, queryFn: listClaims, refetchInterval });

/** Los reclamos de un pedido (`GET /claims?orderId=`); cuelga de la clave de reclamos: toda mutación la refresca. */
export const useOrderClaims = (orderId: string | undefined) =>
  useQuery({
    queryKey: keys.list({ orderId }),
    queryFn: () => listOrderClaims(orderId ?? ''),
    enabled: Boolean(orderId),
  });

/** El reclamo completo, con su pedido y su cliente. */
export const useClaim = (id: string | undefined) =>
  useQuery({ queryKey: keys.detail(id ?? ''), queryFn: () => getClaim(id ?? ''), enabled: Boolean(id) });

export const useUpdateClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateClaimBody }) => updateClaim(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useCreateClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClaimBody) => createClaim(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useResolveClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveClaimBody }) => resolveClaim(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** PENDING → IN_PROCESS: un admin toma el reclamo para revisarlo. */
export const useTakeClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => takeClaim(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** RESOLVED/REJECTED → IN_PROCESS, con motivo. */
export const useReopenClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReopenClaimBody }) => reopenClaim(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
