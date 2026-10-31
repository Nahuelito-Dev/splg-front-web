import { env } from '../../config/env';
import { http } from './httpClient';
import type { PatchRouteBatchSettingsBody, ProcessConfig, RouteBatch, RouteBatchPage, RouteBatchRun } from './types';

const v2 = { baseURL: env.apiUrlV2 };

export interface RouteBatchFilters {
  status?: RouteBatch['status'];
}

/** GET /v2/route-batches: los lotes de recorrido de la distribuidora, con sus paradas y ofertas, y el total por estado (CU-107). */
export const listRouteBatches = async (
  { page, pageSize }: { page: number; pageSize: number },
  filters: RouteBatchFilters = {},
): Promise<RouteBatchPage> => {
  const { data } = await http.get<RouteBatchPage>('/route-batches', {
    ...v2,
    params: { ...filters, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/route-batches/:id: un lote con todas sus paradas en orden de entrega y los choferes contactados. */
export const getRouteBatch = async (id: string): Promise<RouteBatch> => {
  const { data } = await http.get<RouteBatch>(`/route-batches/${id}`, v2);
  return data;
};

/** POST /v2/route-batches/run: arma lotes ahora, sin esperar la frecuencia del proceso. */
export const runRouteBatches = async (): Promise<RouteBatchRun> => {
  const { data } = await http.post<RouteBatchRun>('/route-batches/run', undefined, v2);
  return data;
};

/** POST /v2/route-batches/:id/dissolve: deshace un lote que todavía no tiene chofer; los pedidos vuelven al despacho individual. */
export const dissolveRouteBatch = async (id: string): Promise<RouteBatch> => {
  const { data } = await http.post<RouteBatch>(`/route-batches/${id}/dissolve`, undefined, v2);
  return data;
};

/** GET /v2/route-batches/settings: los parámetros de la agrupación con su rango y valor por omisión. */
export const getRouteBatchSettings = async (): Promise<ProcessConfig> => {
  const { data } = await http.get<ProcessConfig>('/route-batches/settings', v2);
  return data;
};

/** PATCH /v2/route-batches/settings: cambia sólo los parámetros que vienen. */
export const patchRouteBatchSettings = async (body: PatchRouteBatchSettingsBody): Promise<ProcessConfig> => {
  const { data } = await http.patch<ProcessConfig>('/route-batches/settings', body, v2);
  return data;
};
