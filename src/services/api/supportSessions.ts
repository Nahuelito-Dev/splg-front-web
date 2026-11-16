import { env } from '../../config/env';
import { http, type Page, type PageParams, toQuery } from './httpClient';
import type {
  ApproveSupportAccessBody,
  CreateSupportSessionBody,
  EndSupportSessionBody,
  RejectSupportAccessBody,
  SupportAccessEntry,
  SupportAccessList,
  SupportPolicy,
  SupportSession,
  SupportSessionCurrent,
  SupportSessionList,
  UpdateSupportPolicyBody,
} from './types';

export type SupportScope = SupportSession['scope'][number];
export type SupportStatus = SupportSession['status'];

/** Las duraciones que acepta la API (D2): sin renovación, se pide otra. */
export const SUPPORT_MINUTES = [15, 30, 60, 120] as const;
export type SupportMinutes = (typeof SUPPORT_MINUTES)[number];
/** Una emergencia dura como máximo esto. */
export const EMERGENCY_MAX_MINUTES = 60;
/** Largo del motivo que acepta la API. */
export const SUPPORT_REASON_MIN = 20;
export const SUPPORT_REASON_MAX = 1000;
export const SUPPORT_TICKET_MAX = 60;
export const SUPPORT_NOTE_MAX = 500;

/**
 * Las llamadas del propio modo soporte no viajan con `X-Support-Session`: la API las ignora igual, y una sesión que
 * terminó no tiene que tirar abajo la consulta que justamente pregunta si terminó.
 */
const V2 = { baseURL: env.apiUrlV2, skipSupportSession: true } as const;

// ── Plataforma (administrador general) ────────────────────────────────────────

/** GET /v2/support-sessions/current: la sesión activa o, si no hay, el pedido pendiente más nuevo. */
export const getCurrentSupportSession = async (): Promise<SupportSession | null> => {
  const { data } = await http.get<SupportSessionCurrent>('/support-sessions/current', V2);
  return data.session;
};

/** POST /v2/support-sessions: pide acceso (queda pendiente) o abre una emergencia (activa al instante). */
export const requestSupportSession = async (body: CreateSupportSessionBody): Promise<SupportSession> => {
  const { data } = await http.post<SupportSession>('/support-sessions', body, V2);
  return data;
};

/**
 * DELETE /v2/support-sessions/:id: sale de la sesión activa o retira el pedido pendiente. La de otro administrador
 * general se corta con `reason` (obligatorio para la API: queda en la auditoría).
 */
export const endSupportSession = async (id: string, body?: EndSupportSessionBody): Promise<void> => {
  await http.delete(`/support-sessions/${encodeURIComponent(id)}`, body ? { ...V2, data: body } : V2);
};

export interface SupportSessionsParams {
  status?: SupportStatus | '';
  distributorId?: string;
  requestedBy?: string;
  /** Días argentinos (`AAAA-MM-DD`); el back recibe instantes, sobre la fecha del pedido. */
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

/** Los días del filtro son argentinos: `to` incluye el día entero. Lo vacío no viaja. */
export const supportSessionsQuery = ({
  status,
  distributorId,
  requestedBy,
  from,
  to,
  limit,
  offset,
}: SupportSessionsParams) => ({
  status: status || undefined,
  distributorId: distributorId || undefined,
  requestedBy: requestedBy || undefined,
  from: from ? `${from}T00:00:00-03:00` : undefined,
  to: to ? `${to}T23:59:59.999-03:00` : undefined,
  limit,
  offset,
});

/** GET /v2/support-sessions: el historial de sesiones de soporte de toda la plataforma, las más nuevas primero. */
export const listSupportSessions = async (params: SupportSessionsParams): Promise<SupportSessionList> => {
  const { data } = await http.get<SupportSessionList>('/support-sessions', {
    ...V2,
    params: supportSessionsQuery(params),
  });
  return data;
};

/** GET /v2/support-sessions/:id */
export const getSupportSession = async (id: string): Promise<SupportSession> => {
  const { data } = await http.get<SupportSession>(`/support-sessions/${encodeURIComponent(id)}`, V2);
  return data;
};

/** GET /v2/support-sessions/:id/accesses: qué miró el soporte en esa sesión. */
export const listSupportSessionAccesses = async (id: string, params: PageParams): Promise<Page<SupportAccessEntry>> => {
  const { data } = await http.get<SupportAccessList>(`/support-sessions/${encodeURIComponent(id)}/accesses`, {
    ...V2,
    params: toQuery(params),
  });
  return { rows: data.items, total: data.total };
};

// ── Empresa (admin): «Accesos de soporte» ─────────────────────────────────────

/** GET /v2/support-access: pedidos y sesiones de la empresa, los pendientes primero. */
export const listSupportAccess = async (params: PageParams, status?: SupportStatus): Promise<Page<SupportSession>> => {
  const { data } = await http.get<SupportSessionList>('/support-access', {
    ...V2,
    params: { ...toQuery(params), status: status || undefined },
  });
  return { rows: data.items, total: data.total };
};

/** GET /v2/support-access/:id */
export const getSupportAccess = async (id: string): Promise<SupportSession> => {
  const { data } = await http.get<SupportSession>(`/support-access/${encodeURIComponent(id)}`, V2);
  return data;
};

/** GET /v2/support-access/:id/accesses: qué miró el soporte. */
export const listSupportAccessEntries = async (id: string, params: PageParams): Promise<Page<SupportAccessEntry>> => {
  const { data } = await http.get<SupportAccessList>(`/support-access/${encodeURIComponent(id)}/accesses`, {
    ...V2,
    params: toQuery(params),
  });
  return { rows: data.items, total: data.total };
};

/** POST /v2/support-access/:id/approve: puede acortar la duración y achicar el alcance, nunca ampliarlos. */
export const approveSupportAccess = async (id: string, body: ApproveSupportAccessBody): Promise<SupportSession> => {
  const { data } = await http.post<SupportSession>(`/support-access/${encodeURIComponent(id)}/approve`, body, V2);
  return data;
};

/** POST /v2/support-access/:id/reject */
export const rejectSupportAccess = async (id: string, body: RejectSupportAccessBody): Promise<SupportSession> => {
  const { data } = await http.post<SupportSession>(`/support-access/${encodeURIComponent(id)}/reject`, body, V2);
  return data;
};

/** POST /v2/support-access/:id/revoke: corta una sesión activa (también las de emergencia). */
export const revokeSupportAccess = async (id: string): Promise<SupportSession> => {
  const { data } = await http.post<SupportSession>(`/support-access/${encodeURIComponent(id)}/revoke`, {}, V2);
  return data;
};

/** GET /v2/support-access/policy: si se permiten emergencias y si los pedidos se aprueban solos. */
export const getSupportPolicy = async (): Promise<SupportPolicy> => {
  const { data } = await http.get<SupportPolicy>('/support-access/policy', V2);
  return data;
};

/** PUT /v2/support-access/policy */
export const updateSupportPolicy = async (body: UpdateSupportPolicyBody): Promise<SupportPolicy> => {
  const { data } = await http.put<SupportPolicy>('/support-access/policy', body, V2);
  return data;
};
