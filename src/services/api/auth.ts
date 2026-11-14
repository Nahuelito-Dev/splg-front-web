import { ApiError } from './errors';
import { http } from './httpClient';
import type { User } from './types';

export interface AdminInfo {
  fullName: string | null;
  role: 'admin' | 'super_admin';
  blocked: boolean;
}

/**
 * GET /users/email/:email. Sólo admin y super_admin pueden entrar al panel. Sin
 * `X-Support-Session`: es la identidad de la cuenta, no la de una empresa; una sesión de
 * soporte que terminó no puede tirar abajo el login (ver httpClient).
 */
export const getAdmin = async (email: string): Promise<AdminInfo> => {
  const { data } = await http.get<User>(`/users/email/${email}`, { skipSupportSession: true });
  const roleType = data.role?.type;
  if (roleType !== 'admin' && roleType !== 'super_admin') {
    throw new ApiError(403, ['No tenés permisos de administrador']);
  }
  return { fullName: data.full_name, role: roleType, blocked: data.blocked };
};
