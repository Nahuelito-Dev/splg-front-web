import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProcessSummary, listProcessRuns, type ProcessRunsParams } from '../api/processRuns';
import { queryKeys } from './queryKeys';

const keys = queryKeys.processRuns;
const REFRESH_MS = 30_000;

/** El estado de cada proceso se refresca solo: es un tablero de vigilancia. Sin empresa, todas. */
export const useProcessSummary = (distributorId?: string) =>
  useQuery({
    queryKey: [...keys.all, 'summary', distributorId ?? ''] as const,
    queryFn: () => getProcessSummary(distributorId),
    refetchInterval: REFRESH_MS,
  });

export const useProcessRuns = (params: ProcessRunsParams) =>
  useQuery({
    queryKey: keys.list(params),
    queryFn: () => listProcessRuns(params),
    placeholderData: keepPreviousData,
  });
