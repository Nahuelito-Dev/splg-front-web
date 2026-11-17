import { env } from '../../config/env';
import { http } from './httpClient';
import type { MyPermissions, PermissionModule } from './types';

/** GET /v2/me/permissions: los permisos efectivos de la sesión (con los `ver` que implica cada `gestionar`). */
export const getMyPermissions = async (): Promise<MyPermissions> => {
  const { data } = await http.get<MyPermissions>('/me/permissions', { baseURL: env.apiUrlV2 });
  return data;
};

/** GET /v2/permissions: catálogo agrupado para editar roles del personal. */
export const listPermissions = async (): Promise<PermissionModule[]> => {
  const { data } = await http.get<PermissionModule[]>('/permissions', { baseURL: env.apiUrlV2 });
  return data;
};
