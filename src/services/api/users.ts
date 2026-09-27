import { http, toQuery, type Page, type PageParams } from './httpClient';
import type { BloqueoDeUsuario, ListadoDeUsuarios, Message, UpdateUserBody, User } from './types';

/** GET /users: todos los roles, paginados y con búsqueda por término. */
export const listUsers = async (params: PageParams, search?: string): Promise<Page<User>> => {
  const { data } = await http.get<ListadoDeUsuarios>('/users', {
    params: { ...toQuery(params), term: search || undefined },
  });
  return { rows: data.users, total: data.maxUsers };
};

/** GET /users/:id: la ficha de un usuario, con su rol (cliente, chofer o admin). */
export const getUser = async (id: string): Promise<User> => {
  const { data } = await http.get<User>(`/users/${id}`);
  return data;
};

/**
 * PATCH /users/:id con sólo los campos que acepta la API (nombre, teléfono,
 * foto, bloqueo y contraseña nueva). Lo de la cuenta de un cliente es sólo del
 * administrador general: la API responde 403 a un admin de empresa. La usa
 * también la página de Clientes: no cambiar la firma.
 */
export const updateUserAccount = async (userId: string, changes: UpdateUserBody): Promise<User> => {
  const { data } = await http.patch<User>(`/users/${userId}`, changes);
  return data;
};

/** PATCH /users/:id/block: bloquea o habilita la cuenta. */
export const blockUser = async (userId: string, block: boolean): Promise<BloqueoDeUsuario> => {
  const { data } = await http.patch<BloqueoDeUsuario>(`/users/${userId}/block`, { block });
  return data;
};

/** DELETE /users/:id: baja lógica de la cuenta. */
export const deleteUser = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/users/${id}`);
  return data;
};
