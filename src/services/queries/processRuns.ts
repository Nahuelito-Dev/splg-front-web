import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProcessSummary, listProcessRuns, type ProcessRunsParams } from '../api/processRuns';
import { queryKeys } from './queryKeys';

const keys = queryKeys.processRuns;
const REFRESH_MS = 30_000;

/** El estado de cada proceso se refresca solo: es un tablero de vigilancia. */
export const useProcessSummary = () =>
  useQuery({
    queryKey: [...keys.all, 'summary'] as const,
    queryFn: getProcessSummary,
    refetchInterval: REFRESH_MS,
  });

export const useProcessRuns = (params: ProcessRunsParams) =>
  useQuery({
    queryKey: keys.list(params),
    queryFn: () => listProcessRuns(params),
    placeholderData: keepPreviousData,
  });
