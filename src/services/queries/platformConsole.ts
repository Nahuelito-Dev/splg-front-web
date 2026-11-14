import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getCompanyScheduledTasks,
  getDocumentReadingUsage,
  getPlatformCompany,
  getPlatformOverview,
  getPlatformProcesses,
  listPlatformActivity,
  listPlatformCompanies,
  putCompanyScheduledTasks,
  setCompanyOwnedByPlatform,
  type PlatformActivityParams,
  type PlatformCompaniesParams,
  type PlatformRangeParams,
} from '../api/platformConsole';
import type { PlatformScheduledTasksBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.platformConsole;
/** Procesos y alertas: tablero de vigilancia, se refresca solo. */
const REFRESH_MS = 30_000;

export const usePlatformOverview = (params: PlatformRangeParams) =>
  useQuery({
    queryKey: [...keys.all, 'overview', params] as const,
    queryFn: () => getPlatformOverview(params),
    placeholderData: keepPreviousData,
  });

export const usePlatformCompanies = (params: PlatformCompaniesParams, { enabled = true } = {}) =>
  useQuery({
    queryKey: keys.list({ kind: 'companies', ...params }),
    queryFn: () => listPlatformCompanies(params),
    placeholderData: keepPreviousData,
    enabled,
  });

/** El tope de página de `GET /v2/platform/companies`. */
const COMPANIES_PAGE = 100;

/**
 * Todas las empresas vigentes, para elegir una: se piden de a páginas de 100 hasta llegar al total que informa la API
 * (sin tope silencioso). `loading` sigue en `true` mientras falten páginas.
 */
export const useAllPlatformCompanies = () => {
  const query = useInfiniteQuery({
    queryKey: keys.list({ kind: 'companies-all' }),
    queryFn: ({ pageParam }) => listPlatformCompanies({ limit: COMPANIES_PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < last.total && last.items.length > 0 ? loaded : undefined;
    },
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  // Las páginas cargadas van en las dependencias: si la siguiente llega en el mismo render, igual se pide la otra.
  const pagesLoaded = query.data?.pages.length ?? 0;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, pagesLoaded]);
  const companies = query.data?.pages.flatMap((page) => page.items) ?? [];
  return {
    companies,
    total: query.data?.pages[0]?.total,
    loading: query.isPending || Boolean(hasNextPage),
    error: query.error,
  };
};

export const usePlatformCompany = (id: string | undefined, params: PlatformRangeParams = {}) =>
  useQuery({
    queryKey: [...keys.detail(id ?? ''), params] as const,
    queryFn: () => getPlatformCompany(id ?? '', params),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

export const useSetCompanyOwnedByPlatform = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ownedByPlatform }: { id: string; ownedByPlatform: boolean }) =>
      setCompanyOwnedByPlatform(id, ownedByPlatform),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useCompanyScheduledTasks = (id: string | undefined) =>
  useQuery({
    queryKey: [...keys.detail(id ?? ''), 'scheduled-tasks'] as const,
    queryFn: () => getCompanyScheduledTasks(id ?? ''),
    enabled: Boolean(id),
  });

export const useUpdateCompanyScheduledTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlatformScheduledTasksBody }) => putCompanyScheduledTasks(id, body),
    onSuccess: (saved, { id }) => {
      queryClient.setQueryData([...keys.detail(id), 'scheduled-tasks'], saved);
    },
  });
};

export const usePlatformProcesses = () =>
  useQuery({
    queryKey: [...keys.all, 'processes'] as const,
    queryFn: getPlatformProcesses,
    refetchInterval: REFRESH_MS,
  });

export const useDocumentReadingUsage = (month: string) =>
  useQuery({
    queryKey: [...keys.all, 'document-reading-usage', month] as const,
    queryFn: () => getDocumentReadingUsage(month),
    placeholderData: keepPreviousData,
  });

export const usePlatformActivity = (params: PlatformActivityParams) =>
  useQuery({
    queryKey: keys.list({ kind: 'activity', ...params }),
    queryFn: () => listPlatformActivity(params),
    placeholderData: keepPreviousData,
  });
