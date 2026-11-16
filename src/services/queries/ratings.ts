import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRating, getRatingSummary, hideRating, listRatingsForUser, unhideRating } from '../api/ratings';
import type { ModerateRatingBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.ratings;

export const useRatingSummary = (userId: string | undefined) =>
  useQuery({
    queryKey: [...keys.detail(userId ?? ''), 'summary'],
    queryFn: () => getRatingSummary(userId ?? ''),
    enabled: Boolean(userId),
  });

export const useRatingHistory = (userId: string | undefined) =>
  useQuery({
    queryKey: [...keys.detail(userId ?? ''), 'history'],
    queryFn: () => listRatingsForUser(userId ?? ''),
    enabled: Boolean(userId),
  });

/** El resumen de calificaciones de varios usuarios, en el mismo orden que `userIds`. */
export const useRatingSummaries = (userIds: string[]) =>
  useQueries({
    queries: userIds.map((userId) => ({
      queryKey: [...keys.detail(userId), 'summary'],
      queryFn: () => getRatingSummary(userId),
      staleTime: 60_000,
    })),
  });

export const useRating = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getRating(id ?? ''),
    enabled: Boolean(id),
  });

/** Ocultar o volver a mostrar: cambia el promedio, así que se refresca todo lo de calificaciones. */
export const useModerateRating = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hide, body }: { id: string; hide: boolean; body: ModerateRatingBody }) =>
      hide ? hideRating(id, body) : unhideRating(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
