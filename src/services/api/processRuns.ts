import { env } from '../../config/env';
import { http } from './httpClient';
import type { ProcessRun, ProcessRunList, ProcessSummary } from './types';

export interface ProcessRunFilters {
  process?: ProcessRun['process'];
  status?: ProcessRun['status'];
  /** YYYY-MM-DD, día argentino */
  from?: string;
  /** YYYY-MM-DD, día argentino (incluye el día entero) */
  to?: string;
}

export interface ProcessRunsParams extends ProcessRunFilters {
  /** Sólo las corridas de esa empresa. */
  distributorId?: string;
  limit: number;
  offset: number;
}

/** Los días del filtro son argentinos: el back recibe instantes ISO 8601. */
export const processRunsQuery = ({ from, to, process, status, distributorId, limit, offset }: ProcessRunsParams) => ({
  distributorId: distributorId || undefined,
  process: process || undefined,
  status: status || undefined,
  from: from ? `${from}T00:00:00-03:00` : undefined,
  to: to ? `${to}T23:59:59.999-03:00` : undefined,
  limit,
  offset,
});

/**
 * GET /v2/process-runs/summary (sólo plataforma): la última corrida de cada proceso automático con su salud, por
 * empresa y las globales; con `distributorId`, sólo los de esa empresa.
 */
export const getProcessSummary = async (distributorId?: string): Promise<ProcessSummary> => {
  const { data } = await http.get<ProcessSummary>('/process-runs/summary', {
    baseURL: env.apiUrlV2,
    params: { distributorId: distributorId || undefined },
  });
  return data;
};

/** GET /v2/process-runs (sólo plataforma): el historial de corridas, las más nuevas primero. */
export const listProcessRuns = async (params: ProcessRunsParams): Promise<ProcessRunList> => {
  const { data } = await http.get<ProcessRunList>('/process-runs', {
    baseURL: env.apiUrlV2,
    params: processRunsQuery(params),
  });
  return data;
};
