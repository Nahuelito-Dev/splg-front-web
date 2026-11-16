import { env } from '../../config/env';
import { http } from './httpClient';
import type { ChatMetrics, PlatformChatMetrics } from './types';
import type { operations } from './schema';

/**
 * Las métricas del chat (B4): las de la empresa con sus clientes y choferes (`mensajes.supervisar`, módulo `chat`) y
 * las del soporte de la plataforma. Todo lo calcula la API: medianas, p90, porcentajes y la serie diaria.
 */
const V2 = { baseURL: env.apiUrlV2 } as const;

type CompanyQuery = NonNullable<operations['CompanyChatMetricsController_metricasDeLaEmpresa']['parameters']['query']>;
type PlatformQuery = NonNullable<
  operations['PlatformChatMetricsController_metricasDeLaPlataforma']['parameters']['query']
>;

export type ChatMetricsChannel = NonNullable<CompanyQuery['channel']>;

/** Período en días argentinos (`AAAA-MM-DD`, inclusivos). Sin `from`, los 30 días que terminan en `to`. */
export interface ChatMetricsParams {
  from?: string;
  to?: string;
  /** Sin canal, los dos. */
  channel?: ChatMetricsChannel;
}

export interface PlatformChatMetricsParams {
  from?: string;
  to?: string;
  /** Sólo esa empresa; sin ella, todas. */
  distributorId?: string;
}

/** Lo vacío no viaja: la API rechaza un parámetro con valor vacío. */
const clean = <T extends object>(params: T): Partial<T> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')) as Partial<T>;

/** GET /v2/chat/metrics: primera respuesta, resolución, en vivo, asistente, encuesta, plantillas y serie diaria. */
export const getChatMetrics = async (params: ChatMetricsParams = {}): Promise<ChatMetrics> => {
  const query: CompanyQuery = clean(params);
  const { data } = await http.get<ChatMetrics>('/chat/metrics', { ...V2, params: query });
  return data;
};

/** GET /v2/platform/chat/metrics: chat con las empresas, tickets, asistente del soporte y conteos por empresa. */
export const getPlatformChatMetrics = async (params: PlatformChatMetricsParams = {}): Promise<PlatformChatMetrics> => {
  const query: PlatformQuery = clean(params);
  const { data } = await http.get<PlatformChatMetrics>('/platform/chat/metrics', { ...V2, params: query });
  return data;
};
