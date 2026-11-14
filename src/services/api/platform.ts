import { env } from '../../config/env';
import { http } from './httpClient';
import type { Platform } from './types';

/**
 * GET /v2/platform (público): el nombre y el contacto de la plataforma. Es una sola configuración del back
 * (`PLATFORM_NAME`): el panel no lo escribe en ningún lado. Se pide también desde el login, sin sesión.
 */
export const getPlatform = async (): Promise<Platform> => {
  const { data } = await http.get<Platform>('/platform', {
    baseURL: env.apiUrlV2,
    public: true,
    skipSupportSession: true,
  });
  return data;
};
