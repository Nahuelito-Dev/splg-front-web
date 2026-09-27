import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Customer, Message, User } from './types';

/** GET /customers: los clientes de la distribuidora, paginados y con búsqueda. */
export const listCustomers = async (params: PageParams, search?: string): Promise<Page<Customer>> =>
  toPage(await http.get<Customer[]>('/customers', { params: { ...toQuery(params), term: search || undefined } }));

/** GET /customers/:id, con el usuario y sus direcciones. */
export const getCustomer = async (id: string): Promise<Customer> => {
  const { data } = await http.get<Customer>(`/customers/${id}`);
  return data;
};

/** Baja lógica de un cliente. Sólo el administrador general. */
export const deleteCustomer = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/customers/${id}`);
  return data;
};

/** Alta desde el panel: POST /users con rol customer. */
export const createCustomer = (account: AccountFields): Promise<User> => registerUser('customer', account);
