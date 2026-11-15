import { env } from '../../config/env';
import { http } from './httpClient';
import type { CompanyModule, OwnModule, SetCompanyModuleBody } from './types';

const V2 = { baseURL: env.apiUrlV2 };

/** La clave de un módulo del catálogo del back (`document_reading`, `mercadopago`…). */
export type ModuleKey = OwnModule['key'];

/**
 * GET /v2/company/modules: cada módulo del catálogo para la empresa del contexto (la del admin, la de la sesión de
 * soporte o la propia), con si la plataforma se lo habilitó (`enabled`) y si está en uso (`effective`).
 */
export const getCompanyModules = async (): Promise<OwnModule[]> => {
  const { data } = await http.get<OwnModule[]>('/company/modules', V2);
  return data;
};

/** GET /v2/platform/companies/:id/modules: los módulos de una empresa como los ve la plataforma (plan, excepción, impacto). */
export const getPlatformCompanyModules = async (companyId: string): Promise<CompanyModule[]> => {
  const { data } = await http.get<CompanyModule[]>(`/platform/companies/${companyId}/modules`, V2);
  return data;
};

/**
 * PUT /v2/platform/companies/:id/modules/:key: excepción de la plataforma sobre el plan (`enabled: true|false`) o
 * vuelta a lo del plan (`enabled: null`). Idempotente; responde el módulo como queda.
 */
export const setPlatformCompanyModule = async (
  companyId: string,
  key: string,
  body: SetCompanyModuleBody,
): Promise<CompanyModule> => {
  const { data } = await http.put<CompanyModule>(
    `/platform/companies/${companyId}/modules/${encodeURIComponent(key)}`,
    body,
    V2,
  );
  return data;
};
