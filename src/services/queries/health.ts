import { useQuery } from '@tanstack/react-query';
import { getHealth, getReadiness, type HealthReport } from '../api/health';
import { queryKeys } from './queryKeys';

/** Refresco periódico de la página Sistema: no hace falta más seguido que esto. */
const REFRESH_MS = 30_000;

/** El reporte, más cuánto tardó la llamada completa (la API no da latencia por dependencia). */
export interface TimedHealthReport {
  report: HealthReport;
  ms: number;
  fetchedAt: string;
}

const withTiming = async (fn: () => Promise<HealthReport>): Promise<TimedHealthReport> => {
  const start = performance.now();
  const report = await fn();
  return { report, ms: Math.round(performance.now() - start), fetchedAt: new Date().toISOString() };
};

export const useHealth = () =>
  useQuery({
    queryKey: queryKeys.health.detail('check'),
    queryFn: () => withTiming(getHealth),
    refetchInterval: REFRESH_MS,
    retry: false,
  });

export const useReadiness = () =>
  useQuery({
    queryKey: queryKeys.health.detail('ready'),
    queryFn: () => withTiming(getReadiness),
    refetchInterval: REFRESH_MS,
    retry: false,
  });
