import { env } from '../../config/env';
import { http } from './httpClient';
import type { LiveFleet } from './types';

/**
 * GET /v2/tracking/vehicles: los vehículos en uso ahora, con chofer, carga en por ciento, hoja de ruta, paradas y
 * última posición.
 */
export const getLiveFleet = async (): Promise<LiveFleet> => {
  const { data } = await http.get<LiveFleet>('/tracking/vehicles', { baseURL: env.apiUrlV2 });
  return data;
};
