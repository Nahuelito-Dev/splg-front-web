import { http } from './httpClient';
import type { CreateRoleBody, Message, Role, UpdateRoleBody } from './types';

/** GET /role: los roles del sistema (customer, delivery, admin, super_admin, y cualquier otro que exista). */
export const listRoles = async (): Promise<Role[]> => {
  const { data } = await http.get<Role[]>('/role');
  return data;
};

/** GET /role/:id: un rol puntual. Sólo el administrador general. */
export const getRole = async (id: string): Promise<Role> => {
  const { data } = await http.get<Role>(`/role/${id}`);
  return data;
};

/** POST /role/seed: crea los 4 roles del sistema que falten. Idempotente. */
export const seedRoles = async (): Promise<Message> => {
  const { data } = await http.post<Message>('/role/seed');
  return data;
};

/**
 * POST /role (CU-089): sólo el administrador general. Un rol fuera de los
 * cuatro del sistema (`customer`, `delivery`, `admin`, `super_admin`) no
 * habilita nada: los guards del panel y de las apps chequean el rol contra
 * el enum fijo, no contra esta tabla.
 */
export const createRole = async (body: CreateRoleBody): Promise<Role> => {
  const { data } = await http.post<Role>('/role', body);
  return data;
};

/** PATCH /role/:id (CU-089). */
export const updateRole = async (id: string, body: UpdateRoleBody): Promise<Role> => {
  const { data } = await http.patch<Role>(`/role/${id}`, body);
  return data;
};

/** DELETE /role/:id (CU-089): falla si el rol tiene usuarios asignados. */
export const deleteRole = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/role/${id}`);
  return data;
};
