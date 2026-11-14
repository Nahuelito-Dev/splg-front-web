import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  ActivityList,
  CompanyDetail,
  CompanyList,
  CompanyListItem,
  DocumentReadingUsage,
  PlatformCompany,
  PlatformOverview,
  PlatformProcesses,
  PlatformScheduledTasksBody,
  ScheduledTasksConfig,
} from './types';

/**
 * El panel de plataforma (`/v2/platform/*`): lo que el administrador general ve sin entrar a una empresa. Todo es
 * `@Auth(SUPER_ADMIN)`: a cualquier otro rol la API le responde 403. Montos y totales los calcula el back.
 */

/** Período en días argentinos (`AAAA-MM-DD`, inclusivos). Sin extremos, el mes en curso hasta hoy. */
export interface PlatformRangeParams {
  from?: string;
  to?: string;
}

const range = ({ from, to }: PlatformRangeParams) => ({ from: from || undefined, to: to || undefined });

/** GET /v2/platform/overview: empresas por estado, totales del período, lector del mes, procesos y soporte. */
export const getPlatformOverview = async (params: PlatformRangeParams = {}): Promise<PlatformOverview> => {
  const { data } = await http.get<PlatformOverview>('/platform/overview', {
    baseURL: env.apiUrlV2,
    params: range(params),
  });
  return data;
};

export interface PlatformCompaniesParams extends PlatformRangeParams {
  status?: CompanyListItem['status'];
  ownedByPlatform?: boolean;
  limit: number;
  offset: number;
}

/** GET /v2/platform/companies: las empresas vigentes, primero las propias de la plataforma y después por nombre. */
export const listPlatformCompanies = async ({
  status,
  ownedByPlatform,
  limit,
  offset,
  ...period
}: PlatformCompaniesParams): Promise<CompanyList> => {
  const { data } = await http.get<CompanyList>('/platform/companies', {
    baseURL: env.apiUrlV2,
    params: { ...range(period), status: status || undefined, ownedByPlatform, limit, offset },
  });
  return data;
};

/** GET /v2/platform/companies/:id: la ficha (empresa, métricas del período, lector, procesos, admins y soporte). */
export const getPlatformCompany = async (id: string, params: PlatformRangeParams = {}): Promise<CompanyDetail> => {
  const { data } = await http.get<CompanyDetail>(`/platform/companies/${id}`, {
    baseURL: env.apiUrlV2,
    params: range(params),
  });
  return data;
};

/**
 * PUT /v2/platform/companies/:id/owned-by-platform: marca o desmarca la empresa propia. Marcar una empresa que no es
 * de prueba de la plataforma da 409 `COMPANY_NOT_PLATFORM_OWNED`; desmarcar siempre se puede.
 */
export const setCompanyOwnedByPlatform = async (id: string, ownedByPlatform: boolean): Promise<PlatformCompany> => {
  const { data } = await http.put<PlatformCompany>(
    `/platform/companies/${id}/owned-by-platform`,
    { ownedByPlatform },
    { baseURL: env.apiUrlV2 },
  );
  return data;
};

/** GET /v2/platform/companies/:id/scheduled-tasks: las frecuencias de la empresa (y su hora de aviso, sólo lectura). */
export const getCompanyScheduledTasks = async (id: string): Promise<ScheduledTasksConfig> => {
  const { data } = await http.get<ScheduledTasksConfig>(`/platform/companies/${id}/scheduled-tasks`, {
    baseURL: env.apiUrlV2,
  });
  return data;
};

/** PUT /v2/platform/companies/:id/scheduled-tasks: cambia por merge las frecuencias que vienen; la hora no se acepta. */
export const putCompanyScheduledTasks = async (
  id: string,
  body: PlatformScheduledTasksBody,
): Promise<ScheduledTasksConfig> => {
  const { data } = await http.put<ScheduledTasksConfig>(`/platform/companies/${id}/scheduled-tasks`, body, {
    baseURL: env.apiUrlV2,
  });
  return data;
};

/** GET /v2/platform/processes: por proceso, la salud de las empresas que lo corren, alertas y fallas de 24 h. */
export const getPlatformProcesses = async (): Promise<PlatformProcesses> => {
  const { data } = await http.get<PlatformProcesses>('/platform/processes', { baseURL: env.apiUrlV2 });
  return data;
};

/** GET /v2/platform/document-reading-usage: lecturas y costo del lector por empresa en el mes (`AAAA-MM`). */
export const getDocumentReadingUsage = async (month?: string): Promise<DocumentReadingUsage> => {
  const { data } = await http.get<DocumentReadingUsage>('/platform/document-reading-usage', {
    baseURL: env.apiUrlV2,
    params: { month: month || undefined },
  });
  return data;
};

export interface PlatformActivityParams {
  /** Días argentinos (`AAAA-MM-DD`); el back recibe instantes. */
  from?: string;
  to?: string;
  actorUserId?: string;
  distributorId?: string;
  limit: number;
  offset: number;
}

/** Los días del filtro son argentinos: `to` incluye el día entero. */
export const platformActivityQuery = ({
  from,
  to,
  actorUserId,
  distributorId,
  limit,
  offset,
}: PlatformActivityParams) => ({
  from: from ? `${from}T00:00:00-03:00` : undefined,
  to: to ? `${to}T23:59:59.999-03:00` : undefined,
  actorUserId: actorUserId || undefined,
  distributorId: distributorId || undefined,
  limit,
  offset,
});

/** GET /v2/platform/activity: la auditoría propia de la plataforma, de lo más nuevo a lo más viejo. */
export const listPlatformActivity = async (params: PlatformActivityParams): Promise<ActivityList> => {
  const { data } = await http.get<ActivityList>('/platform/activity', {
    baseURL: env.apiUrlV2,
    params: platformActivityQuery(params),
  });
  return data;
};
