import { http, toQuery, type Page, type PageParams } from './httpClient';
import type {
  BloqueoDeUsuario,
  CheckUserExistsBody,
  ListadoDeUsuarios,
  Message,
  UpdateUserBody,
  User,
  UsuarioExiste,
} from './types';

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

/** GET /users/email/:email: la cuenta de la propia sesión (el panel sólo conoce su correo). */
export const getUserByEmail = async (email: string): Promise<User> => {
  const { data } = await http.get<User>(`/users/email/${encodeURIComponent(email)}`, { skipDistributor: true });
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

/**
 * GET /users/phone/:phoneNumber: busca una cuenta por teléfono en formato
 * E.164. Devuelve `null` si nadie lo tiene (la API contesta 200 con el cuerpo
 * vacío, no 404).
 */
export const getUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  const { data } = await http.get<User>(`/users/phone/${encodeURIComponent(phoneNumber)}`);
  return data && 'user_id' in data ? data : null;
};

/**
 * POST /users/check-exists: para validar en vivo, antes de enviar un alta, si
 * el correo o el teléfono ya tienen cuenta. Sólo booleanos: no devuelve datos
 * de la cuenta (a diferencia de `GET /users/:email`, que por eso se dio de
 * baja).
 */
export const checkUserExists = async (body: CheckUserExistsBody): Promise<UsuarioExiste> => {
  const { data } = await http.post<UsuarioExiste>('/users/check-exists', body);
  return data;
};
