import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  AdminInvitation,
  AdminInvitationPage,
  RepurchaseCustomerForecast,
  RepurchaseForecastPage,
  RepurchaseRun,
  RepurchaseStats,
  RunRepurchaseBody,
} from './types';

const v2 = { baseURL: env.apiUrlV2 };

export interface RepurchaseInvitationFilters {
  status?: AdminInvitation['status'];
  userId?: string;
  /** Emitidas desde este día (YYYY-MM-DD, hora argentina). */
  from?: string;
  /** Emitidas hasta este día inclusive. */
  to?: string;
}

/** GET /v2/repurchase/forecast: los clientes a los que se les acaba el gas dentro de `days` días (CU-146). */
export const listRepurchaseForecast = async (
  { page, pageSize }: { page: number; pageSize: number },
  days: number,
): Promise<RepurchaseForecastPage> => {
  const { data } = await http.get<RepurchaseForecastPage>('/repurchase/forecast', {
    ...v2,
    params: { days, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/repurchase/forecast/customers/:userId: la fecha estimada de un cliente (su ficha), o por qué no hay. */
export const getCustomerRepurchase = async (userId: string): Promise<RepurchaseCustomerForecast> => {
  const { data } = await http.get<RepurchaseCustomerForecast>(`/repurchase/forecast/customers/${userId}`, v2);
  return data;
};

/** GET /v2/repurchase/invitations: las invitaciones emitidas, la más nueva primero (CU-106). */
export const listRepurchaseInvitations = async (
  { page, pageSize }: { page: number; pageSize: number },
  filters: RepurchaseInvitationFilters = {},
): Promise<AdminInvitationPage> => {
  const { data } = await http.get<AdminInvitationPage>('/repurchase/invitations', {
    ...v2,
    params: { ...filters, limit: pageSize, offset: page * pageSize },
  });
  return data;
};

/** GET /v2/repurchase/stats: invitaciones del período por resultado y tasa de conversión (por omisión, 90 días). */
export const getRepurchaseStats = async (): Promise<RepurchaseStats> => {
  const { data } = await http.get<RepurchaseStats>('/repurchase/stats', v2);
  return data;
};

/** POST /v2/repurchase/run: corre la anticipación ahora; con `dryRun` sólo calcula a quién invitaría. */
export const runRepurchase = async (body: RunRepurchaseBody): Promise<RepurchaseRun> => {
  const { data } = await http.post<RepurchaseRun>('/repurchase/run', body, v2);
  return data;
};
