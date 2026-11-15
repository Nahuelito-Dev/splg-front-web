import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  AssistantFaq,
  AssistantFaqList,
  AssistantFaqTemplateList,
  CreateAssistantFaqTemplateBody,
  PlatformAssistantFaqTemplate,
  PlatformAssistantFaqTemplateList,
  UpdateAssistantFaqTemplateBody,
  CopyAssistantTemplates,
  CreateAssistantFaqBody,
  CreatePlatformAssistantFaqBody,
  PlatformAssistantFaq,
  PlatformAssistantFaqList,
  UpdateAssistantFaqBody,
  UpdatePlatformAssistantFaqBody,
} from './types';

const V2 = { baseURL: env.apiUrlV2 };

// Base de conocimiento del asistente del chat (DISENO-CH-BOT §4.3): la de cada distribuidora y la de OrixTech.

/** GET /v2/company/assistant/faqs: las preguntas vigentes de la empresa del contexto, con la versión y el tope. */
export const listCompanyFaqs = async (): Promise<AssistantFaqList> => {
  const { data } = await http.get<AssistantFaqList>('/company/assistant/faqs', V2);
  return data;
};

/** POST /v2/company/assistant/faqs: texto plano; 409 si ya hay una igual o se llegó al tope. */
export const createCompanyFaq = async (body: CreateAssistantFaqBody): Promise<AssistantFaq> => {
  const { data } = await http.post<AssistantFaq>('/company/assistant/faqs', body, V2);
  return data;
};

/** PATCH /v2/company/assistant/faqs/:id: lo que no viene queda como estaba. */
export const updateCompanyFaq = async (id: string, body: UpdateAssistantFaqBody): Promise<AssistantFaq> => {
  const { data } = await http.patch<AssistantFaq>(`/company/assistant/faqs/${encodeURIComponent(id)}`, body, V2);
  return data;
};

/** DELETE /v2/company/assistant/faqs/:id: baja lógica (204). */
export const deleteCompanyFaq = async (id: string): Promise<void> => {
  await http.delete(`/company/assistant/faqs/${encodeURIComponent(id)}`, V2);
};

/** POST /v2/company/assistant/faqs/from-templates: copia las preguntas de ejemplo que falten (idempotente). */
export const copyCompanyFaqTemplates = async (): Promise<CopyAssistantTemplates> => {
  const { data } = await http.post<CopyAssistantTemplates>('/company/assistant/faqs/from-templates', undefined, V2);
  return data;
};

/** GET /v2/platform/assistant/faqs: la base de OrixTech (contesta a las distribuidoras en el chat de soporte). */
export const listPlatformFaqs = async (): Promise<PlatformAssistantFaqList> => {
  const { data } = await http.get<PlatformAssistantFaqList>('/platform/assistant/faqs', V2);
  return data;
};

/** POST /v2/platform/assistant/faqs: con su clave (no cambia después). */
export const createPlatformFaq = async (body: CreatePlatformAssistantFaqBody): Promise<PlatformAssistantFaq> => {
  const { data } = await http.post<PlatformAssistantFaq>('/platform/assistant/faqs', body, V2);
  return data;
};

/** PATCH /v2/platform/assistant/faqs/:id: lo que no viene queda como estaba; la clave no cambia. */
export const updatePlatformFaq = async (
  id: string,
  body: UpdatePlatformAssistantFaqBody,
): Promise<PlatformAssistantFaq> => {
  const { data } = await http.patch<PlatformAssistantFaq>(
    `/platform/assistant/faqs/${encodeURIComponent(id)}`,
    body,
    V2,
  );
  return data;
};

/** DELETE /v2/platform/assistant/faqs/:id: baja lógica (204); su clave queda libre. */
export const deletePlatformFaq = async (id: string): Promise<void> => {
  await http.delete(`/platform/assistant/faqs/${encodeURIComponent(id)}`, V2);
};

/** GET /v2/company/assistant/templates: el catálogo de preguntas de ejemplo, con las que la empresa ya tiene. */
export const listCompanyTemplates = async (): Promise<AssistantFaqTemplateList> => {
  const { data } = await http.get<AssistantFaqTemplateList>('/company/assistant/templates', V2);
  return data;
};

/** GET /v2/platform/assistant/templates: el catálogo de preguntas de ejemplo para distribuidoras, con su tope. */
export const listPlatformTemplates = async (): Promise<PlatformAssistantFaqTemplateList> => {
  const { data } = await http.get<PlatformAssistantFaqTemplateList>('/platform/assistant/templates', V2);
  return data;
};

/** POST /v2/platform/assistant/templates: con su clave (no cambia después). */
export const createPlatformTemplate = async (
  body: CreateAssistantFaqTemplateBody,
): Promise<PlatformAssistantFaqTemplate> => {
  const { data } = await http.post<PlatformAssistantFaqTemplate>('/platform/assistant/templates', body, V2);
  return data;
};

/** PATCH /v2/platform/assistant/templates/:id: lo ya copiado a las distribuidoras no se toca. */
export const updatePlatformTemplate = async (
  id: string,
  body: UpdateAssistantFaqTemplateBody,
): Promise<PlatformAssistantFaqTemplate> => {
  const { data } = await http.patch<PlatformAssistantFaqTemplate>(
    `/platform/assistant/templates/${encodeURIComponent(id)}`,
    body,
    V2,
  );
  return data;
};

/** DELETE /v2/platform/assistant/templates/:id: baja lógica (204); deja de ofrecerse, lo copiado sigue. */
export const deletePlatformTemplate = async (id: string): Promise<void> => {
  await http.delete(`/platform/assistant/templates/${encodeURIComponent(id)}`, V2);
};
