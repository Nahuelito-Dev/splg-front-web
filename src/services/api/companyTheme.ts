import { isAxiosError } from 'axios';
import { env } from '../../config/env';
import { sanitizeCompanyTheme } from '../../theme/themeTokens';
import { http } from './httpClient';
import type { CompanyTheme, CompanyThemeBody, ThemeContrastError } from './types';

const V2 = { baseURL: env.apiUrlV2 };

// Los tokens se validan acá, una sola vez (`sanitizeCompanyTheme`): un color inválido toma el de Brasa.

/**
 * GET /v2/company/theme: el tema de la empresa del contexto (la del admin, la de la sesión de soporte o la empresa
 * propia), con su nombre, su logo firmado y los tokens. Sin tema propio, el por omisión (`isDefault`).
 */
export const getCompanyTheme = async (): Promise<CompanyTheme> => {
  const { data } = await http.get<CompanyTheme>('/company/theme', V2);
  return sanitizeCompanyTheme(data);
};

/** POST /v2/company/theme/preview: tokens y contraste que quedarían, sin guardar (se permite en modo soporte). */
export const previewCompanyTheme = async (body: CompanyThemeBody): Promise<CompanyTheme> => {
  const { data } = await http.post<CompanyTheme>('/company/theme/preview', body, V2);
  return sanitizeCompanyTheme(data);
};

/** PUT /v2/company/theme: reemplaza el tema (lo que no se manda queda sin valor). */
export const putCompanyTheme = async (body: CompanyThemeBody): Promise<CompanyTheme> => {
  const { data } = await http.put<CompanyTheme>('/company/theme', body, V2);
  return sanitizeCompanyTheme(data);
};

/** DELETE /v2/company/theme: vuelve al tema por omisión (204). */
export const deleteCompanyTheme = async (): Promise<void> => {
  await http.delete('/company/theme', V2);
};

/** El 400 `THEME_CONTRAST_INSUFFICIENT` con el par que falla y la sugerencia, o `null` si el error es otro. */
export const themeContrastError = (error: unknown): ThemeContrastError | null => {
  if (!isAxiosError(error) || error.response?.status !== 400) return null;
  const body: unknown = error.response.data;
  if (typeof body !== 'object' || body === null) return null;
  const candidate = body as Partial<ThemeContrastError>;
  return candidate.code === 'THEME_CONTRAST_INSUFFICIENT' && typeof candidate.suggestion === 'string'
    ? (candidate as ThemeContrastError)
    : null;
};
