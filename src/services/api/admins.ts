import { http } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Admin, AdminVista, Message, UpdateAdminBody, User } from './types';

/**
 * GET /admin: los administradores. Con `distributorId`, los de esa empresa (el administrador general
 * puede pedir cualquiera; un admin de empresa sólo la suya, si no 403); sin él, los del contexto.
 */
export const listAdmins = async (distributorId?: string): Promise<Admin[]> => {
  const { data } = await http.get<Admin[]>('/admin', { params: { distributorId } });
  return data;
};

/** GET /admin/:id: la ficha de un administrador (usuario, rol y empresa). 404 si no existe o es de otra empresa. */
export const getAdmin = async (id: string): Promise<Admin> => {
  const { data } = await http.get<Admin>(`/admin/${id}`);
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

/**
 * PATCH /admin/:id: nombre y teléfono del administrador (el correo y el bloqueo van por otras rutas). 403 si un admin de
 * empresa se edita a sí mismo, 404 si es de otra empresa o un super admin, 409 si el teléfono ya lo usa otra cuenta.
 */
export const updateAdmin = async (id: string, body: UpdateAdminBody): Promise<Admin> => {
  const { data } = await http.patch<Admin>(`/admin/${id}`, body);
  return data;
};

/**
 * DELETE /admin/:id: baja lógica del administrador (deshabilita su cuenta de acceso; nada se borra). 403 si es uno
 * mismo, 409 si es el último administrador activo de la empresa o el último super admin.
 */
export const deleteAdmin = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/admin/${id}`);
  return data;
};
