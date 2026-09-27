import { http } from './httpClient';
import type { Message, Role } from './types';

/** GET /role: los roles del sistema (customer, delivery, admin, super_admin, y cualquier otro que exista). */
export const listRoles = async (): Promise<Role[]> => {
  const { data } = await http.get<Role[]>('/role');
  return data;
};

/** POST /role/seed: crea los 4 roles del sistema que falten. Idempotente. */
export const seedRoles = async (): Promise<Message> => {
  const { data } = await http.post<Message>('/role/seed');
  return data;
};
