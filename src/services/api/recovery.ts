import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  PatchRecoverySettingsBody,
  ProcessConfig,
  RecoveryCaseDetail,
  RecoveryCasePage,
  RecoveryCustomerScore,
  RecoveryReport,
  RecoveryRun,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };
const v3 = { baseURL: env.apiUrlV3 };

export type RecoveryCaseStatus = RecoveryCaseDetail['status'];

/** Lo que el administrador decide sobre un caso escalado o perdido (CU-108, paso 11). */
export type RecoveryDecision = 'charge_deposit' | 'write_off' | 'close_no_charge';

export interface ResolveRecoveryBody {
  decision: RecoveryDecision;
  note: string;
}

export interface RecoveryCaseFilters {
  status?: RecoveryCaseStatus;
  /** 1 recordatorio, 2 aviso del depósito, 3 agotado. */
  step?: number;
  /** `user_id` del cliente. */
  customerId?: string;
  /** Sólo los que siguen en pie (abiertos, escalados y perdidos): el filtro lo resuelve el back. */
  live?: boolean;
  /** Sólo los que esperan la decisión del administrador (escalados y perdidos). */
  pending?: boolean;
}

/** GET /v2/cylinder-recovery/cases: los casos de recupero de envases, con los totales por estado (CU-108). */
export const listRecoveryCases = async (
  { page, pageSize }: { page: number; pageSize: number },
  filters: RecoveryCaseFilters = {},
): Promise<RecoveryCasePage> => {
  const { data } = await http.get<RecoveryCasePage>('/cylinder-recovery/cases', {
    ...v2,
    params: { ...filters, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/cylinder-recovery/cases/:id: el legajo (avisos, ofertas de retiro, historial del envase y resolución). */
export const getRecoveryCase = async (id: string): Promise<RecoveryCaseDetail> => {
  const { data } = await http.get<RecoveryCaseDetail>(`/cylinder-recovery/cases/${id}`, v2);
  return data;
};

/** POST /v2/cylinder-recovery/cases/:id/resolve: cobrar el depósito, dar de baja el envase o cerrar sin cargo. */
export const resolveRecoveryCase = async (id: string, body: ResolveRecoveryBody): Promise<RecoveryCaseDetail> => {
  const { data } = await http.post<RecoveryCaseDetail>(`/cylinder-recovery/cases/${id}/resolve`, body, v2);
  return data;
};

/** GET /v2/cylinder-recovery/report: envases perdidos, escalados sin resolver y envases para revisión manual. */
export const getRecoveryReport = async (): Promise<RecoveryReport> => {
  const { data } = await http.get<RecoveryReport>('/cylinder-recovery/report', v2);
  return data;
};

/** GET /v2/cylinder-recovery/settings: los parámetros del módulo con su rango y valor por omisión. */
export const getRecoverySettings = async (): Promise<ProcessConfig> => {
  const { data } = await http.get<ProcessConfig>('/cylinder-recovery/settings', v2);
  return data;
};

/** PATCH /v2/cylinder-recovery/settings: cambia sólo los parámetros que vienen. */
export const patchRecoverySettings = async (body: PatchRecoverySettingsBody): Promise<ProcessConfig> => {
  const { data } = await http.patch<ProcessConfig>('/cylinder-recovery/settings', body, v2);
  return data;
};

/** POST /v2/cylinder-recovery/run: corre la recuperación ahora, sin esperar la hora diaria. */
export const runRecovery = async (): Promise<RecoveryRun> => {
  const { data } = await http.post<RecoveryRun>('/cylinder-recovery/run', undefined, v2);
  return data;
};

/** GET /v3/cylinder-recovery/customers/:customerId/score: el puntaje de riesgo del cliente y los plazos que le rigen (M5). */
export const getRecoveryCustomerScore = async (customerId: string): Promise<RecoveryCustomerScore> => {
  const { data } = await http.get<RecoveryCustomerScore>(`/cylinder-recovery/customers/${customerId}/score`, v3);
  return data;
};
