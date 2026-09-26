import { privateAxiosInstance } from './axiosConfig';
import { registrarUsuario } from './registro';

export interface AdminRole {
  role_id: string;
  /** Identificador del rol (columna `type` del backend): 'admin' | 'super_admin' | ... */
  type: string;
}

export interface AdminUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  role_id?: string | null;
  role?: AdminRole;
}

export interface Admin {
  admin_id: string;
  user_id: string;
  role_id: string | null;
  distributor_id?: string | null;
  user?: AdminUser;
  role?: AdminRole;
  distributor?: { distributor_id: string; name: string; slug: string };
}

export interface RegisterAdminPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  rol: 'admin' | 'super_admin';
  distributorId?: string;
}

// GET /admin — lista de admins (scopeada por distribuidora en el backend).
export const getAdmins = async () => {
  const { data } = await privateAxiosInstance.get<Admin[]>('/admin');
  return data;
};

// Alta de un admin: POST /users con rol admin o super_admin. Un admin de
// empresa sólo crea admins de su distribuidora; el backend lo controla.
export const registerAdmin = (payload: RegisterAdminPayload) =>
  registrarUsuario(payload);
