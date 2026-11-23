import { env } from '../../config/env';
import { http } from './httpClient';
import type { DispatchMetrics } from './types';

/** GET /v2/dispatch/metrics: cómo viene el despacho automático. Sin período, los últimos 30 días. */
export const getDispatchMetrics = async (): Promise<DispatchMetrics> => {
  const { data } = await http.get<DispatchMetrics>('/dispatch/metrics', { baseURL: env.apiUrlV2 });
  return data;
};
