import { toApiError } from './errors';
import { http, toQuery, type Page, type PageParams } from './httpClient';
import type {
  CreateUserAddressBody,
  DireccionBorrada,
  ListadoDeDirecciones,
  UpdateUserAddressBody,
  UserAddressConUsuario,
} from './types';

/**
 * GET /user-address: todas las direcciones de entrega, paginadas, la principal primero. Sólo el
 * administrador general (403 al admin de empresa). La API no filtra ni busca: ignora `term` y `role`.
 */
export const listAllUserAddresses = async (params: PageParams): Promise<Page<UserAddressConUsuario>> => {
  const { data } = await http.get<ListadoDeDirecciones>('/user-address', { params: toQuery(params) });
  return { rows: data.addresses, total: data.total };
};

/**
 * GET /user-address/user/:userId: las direcciones de un usuario, la
 * predeterminada primero. Las direcciones de un cliente las administra el
 * administrador general (la API rechaza la escritura a un admin de empresa),
 * por eso las mutaciones de este archivo sólo tienen sentido con
 * `canManageCustomerAccounts`.
 */
export const listUserAddresses = async (userId: string): Promise<UserAddressConUsuario[]> => {
  const { data } = await http.get<UserAddressConUsuario[]>(`/user-address/user/${userId}`);
  return data;
};

/**
 * GET /user-address/user/:userId/default: sólo la dirección principal, para
 * destacarla en el resumen de la ficha sin traer el listado completo.
 */
export const getDefaultUserAddress = async (userId: string): Promise<UserAddressConUsuario | null> => {
  try {
    const { data } = await http.get<UserAddressConUsuario>(`/user-address/user/${userId}/default`);
    return data;
  } catch (error) {
    if (toApiError(error).notFound) return null;
    throw error;
  }
};

/** GET /user-address/:id: una dirección puntual, para editarla con el dato fresco. */
export const getUserAddress = async (addressId: string): Promise<UserAddressConUsuario> => {
  const { data } = await http.get<UserAddressConUsuario>(`/user-address/${addressId}`);
  return data;
};

/** POST /user-address: crea una dirección para un usuario existente. */
export const createUserAddress = async (body: CreateUserAddressBody): Promise<UserAddressConUsuario> => {
  const { data } = await http.post<UserAddressConUsuario>('/user-address', body);
  return data;
};

/** PATCH /user-address/:id: `latitude` y `longitude` se cambian juntas. */
export const updateUserAddress = async (
  addressId: string,
  body: UpdateUserAddressBody,
): Promise<UserAddressConUsuario> => {
  const { data } = await http.patch<UserAddressConUsuario>(`/user-address/${addressId}`, body);
  return data;
};

/** PATCH /user-address/:id/set-default: la marca como principal (única). */
export const setDefaultUserAddress = async (addressId: string): Promise<UserAddressConUsuario> => {
  const { data } = await http.patch<UserAddressConUsuario>(`/user-address/${addressId}/set-default`);
  return data;
};

/** DELETE /user-address/:id: baja lógica. Si era la principal, la API elige otra. */
export const deleteUserAddress = async (addressId: string): Promise<DireccionBorrada> => {
  const { data } = await http.delete<DireccionBorrada>(`/user-address/${addressId}`);
  return data;
};
