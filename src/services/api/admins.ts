import { http } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Admin, User } from './types';

/** GET /admin: los administradores, acotados a la distribuidora del token. */
export const listAdmins = async (): Promise<Admin[]> => {
  const { data } = await http.get<Admin[]>('/admin');
  return data;
};

export type AdminRole = 'admin' | 'super_admin';

/** Los datos de cuenta de un admin nuevo. La empresa sólo la elige un administrador general. */
export type AdminAccountFields = AccountFields & { distributorId?: string };

/** Alta de un admin: POST /users con rol admin o super_admin. */
export const createAdmin = (role: AdminRole, account: AdminAccountFields): Promise<User> => registerUser(role, account);
