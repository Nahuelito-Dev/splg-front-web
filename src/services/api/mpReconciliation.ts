import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type { ListParams } from './stock';
import type {
  ApplyMpReconciliationBody,
  CreateMpReconciliationBody,
  DownloadLink,
  MpApply,
  MpReconciliation,
  MpReconciliationDetail,
  MpReconciliationPage,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };
const BASE = '/mercadopago/reconciliations';

export interface MpReconciliationFilters {
  status?: MpReconciliation['status'];
}

/** GET /v2/mercadopago/reconciliations */
export const listMpReconciliations = async (
  { page, pageSize }: ListParams,
  filters: MpReconciliationFilters = {},
): Promise<MpReconciliationPage> => {
  const { data } = await http.get<MpReconciliationPage>(BASE, {
    ...v2,
    params: { page: page + 1, limit: pageSize, ...filters },
  });
  return data;
};

/** GET /v2/mercadopago/reconciliations/:id (si espera el reporte, el back antes le pregunta a Mercado Pago). */
export const getMpReconciliation = async (id: string): Promise<MpReconciliationDetail> => {
  const { data } = await http.get<MpReconciliationDetail>(`${BASE}/${id}`, v2);
  return data;
};

/** POST /v2/mercadopago/reconciliations: pide el reporte de liberaciones del rango. */
export const createMpReconciliation = async (
  body: CreateMpReconciliationBody,
  key: string,
): Promise<MpReconciliation> => {
  const { data } = await http.post<MpReconciliation>(BASE, body, { ...v2, headers: idempotencyHeaders(key) });
  return data;
};

/** POST /v2/mercadopago/reconciliations/:id/apply: asienta las diferencias elegidas; cada una una sola vez. */
export const applyMpReconciliation = async (
  id: string,
  body: ApplyMpReconciliationBody,
  key: string,
): Promise<MpApply> => {
  const { data } = await http.post<MpApply>(`${BASE}/${id}/apply`, body, { ...v2, headers: idempotencyHeaders(key) });
  return data;
};

/** GET /v2/mercadopago/reconciliations/:id/report: el enlace firmado al CSV de Mercado Pago (comprobante). */
export const getMpReconciliationReport = async (id: string): Promise<DownloadLink> => {
  const { data } = await http.get<DownloadLink>(`${BASE}/${id}/report`, v2);
  return data;
};
