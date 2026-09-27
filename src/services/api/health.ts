import { isAxiosError } from 'axios';
import { http } from './httpClient';
import type { operations } from './schema';

/**
 * `HealthController_check`/`_ready` no tienen un DTO con nombre en el
 * Swagger (Terminus arma la respuesta inline): se toma el tipo directo de
 * la operación en vez de inventar una interfaz a mano.
 */
export type HealthReport = operations['HealthController_check']['responses'][200]['content']['application/json'];

/**
 * GET /health: postgres, redis, memoria (RSS < 300MB) y disco (>10% libre).
 * Devuelve 200 si todo está `up` y 503 si algo falla; en los dos casos el
 * cuerpo trae el detalle por dependencia, así que se lee igual pase lo que
 * pase (no se usa `http.get` sin más: axios tira en el 503).
 */
export const getHealth = async (): Promise<HealthReport> => {
  try {
    const { data } = await http.get<HealthReport>('/health');
    return data;
  } catch (error) {
    const body = errorBody(error);
    if (body) return body;
    throw error;
  }
};

/** GET /health/ready: sólo postgres y redis (lo que hace falta para atender tráfico). */
export const getReadiness = async (): Promise<HealthReport> => {
  try {
    const { data } = await http.get<HealthReport>('/health/ready');
    return data;
  } catch (error) {
    const body = errorBody(error);
    if (body) return body;
    throw error;
  }
};

/** El 503 de Terminus trae el mismo cuerpo `{ status, info, error, details }` que el 200. */
const errorBody = (error: unknown): HealthReport | null => {
  if (isAxiosError(error) && error.response?.status === 503 && typeof error.response.data === 'object') {
    return error.response.data as HealthReport;
  }
  return null;
};
