import { http } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Admin, AdminVista, User } from './types';

/**
 * GET /admin: los administradores. Con `distributorId`, los de esa empresa (el administrador general
 * puede pedir cualquiera; un admin de empresa sólo la suya, si no 403); sin él, los del contexto.
 */
export const listAdmins = async (distributorId?: string): Promise<Admin[]> => {
  const { data } = await http.get<Admin[]>('/admin', { params: { distributorId } });
  return data;
};

/** GET /admin/term/:term (CU-088): un admin puntual, por su id o su correo. */
export const findAdminByTerm = async (term: string): Promise<AdminVista> => {
  const { data } = await http.get<AdminVista>(`/admin/term/${encodeURIComponent(term)}`);
  return data;
};

export type AdminRole = 'admin' | 'super_admin';

/** Los datos de cuenta de un admin nuevo. La empresa sólo la elige un administrador general. */
export type AdminAccountFields = AccountFields & { distributorId?: string };

/** Alta de un admin: POST /users con rol admin o super_admin. */
export const createAdmin = (role: AdminRole, account: AdminAccountFields): Promise<User> => registerUser(role, account);
