import { privateAxiosInstance } from './axiosConfig';

export interface AdminRole {
  role_id: string;
  name: string;
}

export interface AdminUser {
  user_id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
}

export interface Admin {
  admin_id: string;
  user_id: string;
  role_id: string;
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
  role_id: string;
  distributorId?: string;
}

// GET /admin — lista de admins (scopeada por distribuidora en el backend).
export const getAdmins = async () => {
  const { data } = await privateAxiosInstance.get<Admin[]>('/admin');
  return data;
};

// POST /admin/register — alta de admin (super_admin). El backend crea el user
// en Firebase + DB y la entidad Admin, asociándolo a la distribuidora.
export const registerAdmin = async (payload: RegisterAdminPayload) => {
  const { data } = await privateAxiosInstance.post('/admin/register', payload);
  return data;
};

// GET /role — roles disponibles para asignar al admin.
export const getRoles = async () => {
  const { data } = await privateAxiosInstance.get<AdminRole[]>('/role');
  return data;
};
