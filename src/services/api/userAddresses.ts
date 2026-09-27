import { http } from './httpClient';
import type { CreateUserAddressBody, DireccionBorrada, UpdateUserAddressBody, UserAddressConUsuario } from './types';

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
