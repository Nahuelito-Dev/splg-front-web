import { useQueries, useQuery } from '@tanstack/react-query';
import { getRatingSummary, listRatingsForUser } from '../api/ratings';
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
