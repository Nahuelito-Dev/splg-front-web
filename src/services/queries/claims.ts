import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClaim, listClaims, resolveClaim } from '../api/claims';
import type { CreateClaimBody, ResolveClaimBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.claims;

export const useClaims = ({ refetchInterval }: { refetchInterval?: number } = {}) =>
  useQuery({ queryKey: keys.all, queryFn: listClaims, refetchInterval });

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
