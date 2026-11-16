import { env } from '../../config/env';
import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Customer, Message, User } from './types';

/** Estado de la cuenta que acepta `?status=` de GET /customers. */
export type CustomerStatus = 'active' | 'blocked';

/** Los parámetros de GET /customers sin paginar: los mismos que usa el exporte completo. */
export const customerQuery = (search?: string, status?: CustomerStatus) => ({ term: search || undefined, status });

/** GET /customers: los clientes de la distribuidora, paginados, con búsqueda y filtro por estado de la cuenta. */
export const listCustomers = async (
  params: PageParams,
  search?: string,
  status?: CustomerStatus,
): Promise<Page<Customer>> =>
  toPage(
    await http.get<Customer[]>('/customers', { params: { ...toQuery(params), ...customerQuery(search, status) } }),
  );

/** GET /customers/:id, con el usuario y sus direcciones. */
export const getCustomer = async (id: string): Promise<Customer> => {
  const { data } = await http.get<Customer>(`/customers/${id}`);
  return data;
};

/**
 * GET /customers/user/:userId: resuelve la ficha de cliente a partir de la
 * cuenta de usuario (CU-130). Lo usa la búsqueda rápida del listado y las
 * pantallas que llegan con un `user_id` desde otra parte del panel.
 */
export const getCustomerByUserId = async (userId: string): Promise<Customer> => {
  const { data } = await http.get<Customer>(`/customers/user/${userId}`);
  return data;
};

/**
 * PATCH /customers/:id/location (CU-094): la única escritura real de
 * `PATCH /customers/:id` (CU-131) que tiene sentido desde el panel es esta
 * misma coordenada, con la validación dedicada del formato "lat,lng"; el
 * resto del DTO (`notification_token`) es un dato interno del dispositivo.
 * A diferencia de la cuenta y las direcciones, la API no la restringe al
 * administrador general: la escribe cualquier admin con rol ADMIN o
 * SUPER_ADMIN (confirmado contra `customer.controller.spec.ts`).
 */
export const updateCustomerLocation = async (id: string, latLng: string): Promise<Customer> => {
  const { data } = await http.patch<Customer>(`/customers/${id}/location`, { latLng });
  return data;
};

/**
 * DELETE /v2/customers/:id/distributor: baja del cliente en esta distribuidora. No toca su cuenta ni sus pedidos; el
 * back responde 409 si tiene pedidos en curso.
 */
export const removeCustomerFromDistributor = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/customers/${id}/distributor`, { baseURL: env.apiUrlV2 });
  return data;
};

/** GET /v2/customers/removed: los clientes que la distribuidora dio de baja, paginados y con búsqueda. */
export const listRemovedCustomers = async (params: PageParams, search?: string): Promise<Page<Customer>> =>
  toPage(
    await http.get<Customer[]>('/customers/removed', {
      baseURL: env.apiUrlV2,
      params: { ...toQuery(params), term: search || undefined },
    }),
  );

/** POST /v2/customers/:id/distributor: vuelve a dar de alta en la distribuidora a un cliente dado de baja. */
export const restoreCustomerInDistributor = async (id: string): Promise<Message> => {
  const { data } = await http.post<Message>(`/customers/${id}/distributor`, undefined, { baseURL: env.apiUrlV2 });
  return data;
};

/** Alta desde el panel: POST /users con rol customer. */
export const createCustomer = (account: AccountFields): Promise<User> => registerUser('customer', account);
