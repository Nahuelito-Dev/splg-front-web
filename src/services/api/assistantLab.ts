import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  AssistantFaq,
  AssistantPreview,
  AssistantPreviewBody,
  CreateFaqFromUnansweredBody,
  CreateRegressionCaseBody,
  PlatformAssistantFaq,
  PlatformAssistantPreviewBody,
  RegressionCase,
  RegressionCaseList,
  RegressionRun,
  UnansweredList,
  UpdateRegressionCaseBody,
} from './types';

const V2 = { baseURL: env.apiUrlV2 };

// Probador, preguntas sin respuesta y lote de pruebas del asistente: el de cada distribuidora y el de OrixTech.

/** El período de las preguntas sin respuesta (AAAA-MM-DD). Sin fechas, el back toma los últimos 30 días. */
export interface UnansweredPeriod {
  from?: string;
  to?: string;
}

const periodParams = ({ from, to }: UnansweredPeriod) => ({
  ...(from ? { from } : {}),
  ...(to ? { to } : {}),
});

const unansweredPath = (scope: 'company' | 'platform', id: string, action: 'faq' | 'dismiss') =>
  `/${scope}/assistant/unanswered/${encodeURIComponent(id)}/${action}`;

/** POST /v2/company/assistant/preview: qué contestaría el asistente, sin crear conversación. 429 al pasar el cupo. */
export const previewCompanyAssistant = async (body: AssistantPreviewBody): Promise<AssistantPreview> => {
  const { data } = await http.post<AssistantPreview>('/company/assistant/preview', body, V2);
  return data;
};

/** POST /v2/platform/assistant/preview: lo mismo con la base de OrixTech (sin cliente). */
export const previewPlatformAssistant = async (body: PlatformAssistantPreviewBody): Promise<AssistantPreview> => {
  const { data } = await http.post<AssistantPreview>('/platform/assistant/preview', body, V2);
  return data;
};

/** GET /v2/company/assistant/unanswered: las preguntas que el asistente no supo contestar, agrupadas. */
export const listCompanyUnanswered = async (period: UnansweredPeriod): Promise<UnansweredList> => {
  const { data } = await http.get<UnansweredList>('/company/assistant/unanswered', {
    ...V2,
    params: periodParams(period),
  });
  return data;
};

/** GET /v2/platform/assistant/unanswered: las del soporte de OrixTech. */
export const listPlatformUnanswered = async (period: UnansweredPeriod): Promise<UnansweredList> => {
  const { data } = await http.get<UnansweredList>('/platform/assistant/unanswered', {
    ...V2,
    params: periodParams(period),
  });
  return data;
};

/** POST /v2/company/assistant/unanswered/:id/faq: crea el borrador (201) o devuelve el que ya tenía el grupo (200). */
export const createCompanyFaqFromUnanswered = async (
  id: string,
  body: CreateFaqFromUnansweredBody,
): Promise<AssistantFaq> => {
  const { data } = await http.post<AssistantFaq>(unansweredPath('company', id, 'faq'), body, V2);
  return data;
};

/** POST /v2/platform/assistant/unanswered/:id/faq: el borrador en la base de OrixTech. */
export const createPlatformFaqFromUnanswered = async (
  id: string,
  body: CreateFaqFromUnansweredBody,
): Promise<PlatformAssistantFaq> => {
  const { data } = await http.post<PlatformAssistantFaq>(unansweredPath('platform', id, 'faq'), body, V2);
  return data;
};

/** POST /v2/company/assistant/unanswered/:id/dismiss: deja de mostrar el grupo (204). */
export const dismissCompanyUnanswered = async (id: string): Promise<void> => {
  await http.post(unansweredPath('company', id, 'dismiss'), undefined, V2);
};

/** POST /v2/platform/assistant/unanswered/:id/dismiss (204). */
export const dismissPlatformUnanswered = async (id: string): Promise<void> => {
  await http.post(unansweredPath('platform', id, 'dismiss'), undefined, V2);
};

/** GET /v2/company/assistant/regression/cases: los casos del lote de pruebas y su tope. */
export const listRegressionCases = async (): Promise<RegressionCaseList> => {
  const { data } = await http.get<RegressionCaseList>('/company/assistant/regression/cases', V2);
  return data;
};

/** POST /v2/company/assistant/regression/cases: 409 si ya hay uno igual o se llegó al tope. */
export const createRegressionCase = async (body: CreateRegressionCaseBody): Promise<RegressionCase> => {
  const { data } = await http.post<RegressionCase>('/company/assistant/regression/cases', body, V2);
  return data;
};

/** PATCH /v2/company/assistant/regression/cases/:id: pasar a «derivar» sin menciones las vacía. */
export const updateRegressionCase = async (id: string, body: UpdateRegressionCaseBody): Promise<RegressionCase> => {
  const { data } = await http.patch<RegressionCase>(
    `/company/assistant/regression/cases/${encodeURIComponent(id)}`,
    body,
    V2,
  );
  return data;
};

/** DELETE /v2/company/assistant/regression/cases/:id: baja lógica (204). */
export const deleteRegressionCase = async (id: string): Promise<void> => {
  await http.delete(`/company/assistant/regression/cases/${encodeURIComponent(id)}`, V2);
};

/** POST /v2/company/assistant/regression/run: arranca una corrida (202, `running`); 429 si no pasó el enfriamiento. */
export const runRegression = async (): Promise<RegressionRun> => {
  const { data } = await http.post<RegressionRun>('/company/assistant/regression/run', undefined, V2);
  return data;
};

/** GET /v2/company/assistant/regression/runs/last: la última corrida; 404 si nunca se corrió. */
export const getLastRegressionRun = async (): Promise<RegressionRun> => {
  const { data } = await http.get<RegressionRun>('/company/assistant/regression/runs/last', V2);
  return data;
};
