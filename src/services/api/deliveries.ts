import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Delivery, Message, UpdateDeliveryBody } from './types';

/** Los datos de cuenta más lo operativo que se puede fijar al dar de alta un chofer. */
export interface NewDeliveryAccount extends AccountFields {
  /** Sólo lo usa el administrador general: en qué distribuidora queda el chofer. */
  distributorId?: string;
  /** Chofer ya aprobado por la distribuidora. */
  validated?: boolean;
  /** Habilitado por el admin (la API lo guarda como `isEnabled`; el chofer arranca desconectado). */
  isActive?: boolean;
}

/** GET /delivery: la flota de choferes, paginada y con búsqueda. */
export const listDeliveries = async (params: PageParams, search?: string): Promise<Page<Delivery>> =>
  toPage(await http.get<Delivery[]>('/delivery', { params: { ...toQuery(params), term: search || undefined } }));

/** GET /delivery/active: los choferes en línea y listos (habilitados, validados y conectados en su app). */
export const listActiveDeliveries = async (params: PageParams, search?: string): Promise<Page<Delivery>> =>
  toPage(await http.get<Delivery[]>('/delivery/active', { params: { ...toQuery(params), term: search || undefined } }));

/** GET /delivery/:id */
export const getDelivery = async (id: string): Promise<Delivery> => {
  const { data } = await http.get<Delivery>(`/delivery/${id}`);
  return data;
};

/** Alta desde el panel: POST /users con rol delivery. */
export const createDelivery = ({ distributorId, validated, isActive, ...account }: NewDeliveryAccount) =>
  registerUser('delivery', { ...account, distributorId, validated, isActive });

/** PATCH /delivery/:id: hoy sólo acepta `validated`. */
export const updateDeliveryStatus = async (id: string, changes: UpdateDeliveryBody): Promise<Delivery> => {
  const { data } = await http.patch<Delivery>(`/delivery/${id}`, changes);
  return data;
};

/**
 * PATCH /delivery/:id/status: habilita o deshabilita al chofer. Al
 * deshabilitarlo la API también lo desconecta y lo saca del radar de despacho.
 */
export const setDeliveryEnabled = async (id: string, isEnabled: boolean): Promise<Delivery> => {
  const { data } = await http.patch<Delivery>(`/delivery/${id}/status`, { isEnabled });
  return data;
};

/** Baja lógica de un chofer. */
export const deleteDelivery = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/delivery/${id}`);
  return data;
};
