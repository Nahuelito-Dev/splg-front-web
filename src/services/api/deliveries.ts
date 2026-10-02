import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import { registerUser, type AccountFields } from './registration';
import type { Delivery, DisponibilidadDelChofer, Message } from './types';

/** Los cuatro grupos administrativos en los que `GET /delivery` puede filtrar (`status`). */
export type DeliveryStatusFilter = 'enabled' | 'disabled' | 'online' | 'unvalidated';

/** Los datos de cuenta más lo operativo que se puede fijar al dar de alta un chofer. */
export interface NewDeliveryAccount extends AccountFields {
  /** Sólo lo usa el administrador general: en qué distribuidora queda el chofer. */
  distributorId?: string;
  /** Chofer ya aprobado por la distribuidora. */
  validated?: boolean;
  /** Habilitado por el admin (la API lo guarda como `isEnabled`; el chofer arranca desconectado). */
  isActive?: boolean;
}

/** GET /delivery: la flota de choferes, paginada, con búsqueda y filtro por grupo administrativo. */
export const listDeliveries = async (
  params: PageParams,
  search?: string,
  status?: DeliveryStatusFilter,
): Promise<Page<Delivery>> =>
  toPage(
    await http.get<Delivery[]>('/delivery', { params: { ...toQuery(params), term: search || undefined, status } }),
  );

/** GET /delivery/active: los choferes en línea y listos (habilitados, validados y conectados en su app). */
export const listActiveDeliveries = async (params: PageParams, search?: string): Promise<Page<Delivery>> =>
  toPage(await http.get<Delivery[]>('/delivery/active', { params: { ...toQuery(params), term: search || undefined } }));

/** GET /delivery/:id */
export const getDelivery = async (id: string): Promise<Delivery> => {
  const { data } = await http.get<Delivery>(`/delivery/${id}`);
  return data;
};

/**
 * GET /delivery/user/:userId: resuelve el perfil de chofer a partir de la
 * cuenta de usuario (CU-110). Lo usa la búsqueda rápida del listado y las
 * pantallas que llegan con un `user_id` desde otra parte del panel.
 */
export const getDeliveryByUserId = async (userId: string): Promise<Delivery> => {
  const { data } = await http.get<Delivery>(`/delivery/user/${userId}`);
  return data;
};

/** Alta desde el panel: POST /users con rol delivery. */
export const createDelivery = ({ distributorId, validated, isActive, ...account }: NewDeliveryAccount) =>
  registerUser('delivery', { ...account, distributorId, validated, isActive });

/** PATCH /delivery/:id/validate: marca al chofer como validado (CU-032). No condiciona su operación. */
export const validateDelivery = async (id: string): Promise<Delivery> => {
  const { data } = await http.patch<Delivery>(`/delivery/${id}/validate`);
  return data;
};

/** PATCH /delivery/:id/invalidate: le retira la marca de validado (CU-032). */
export const invalidateDelivery = async (id: string): Promise<Delivery> => {
  const { data } = await http.patch<Delivery>(`/delivery/${id}/invalidate`);
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

/**
 * PATCH /delivery/user/:userId/availability: pone al chofer en línea o lo
 * desconecta (CU-022/CU-049 lo usan de soporte). Ponerlo en línea exige que
 * ya esté habilitado y validado; desconectarlo siempre se permite.
 */
export const toggleDeliveryAvailability = async (
  userId: string,
  available: boolean,
): Promise<DisponibilidadDelChofer> => {
  const { data } = await http.patch<DisponibilidadDelChofer>(`/delivery/user/${userId}/availability`, { available });
  return data;
};

/**
 * PATCH /delivery/:id/balance: ajusta el saldo del chofer (CU-049). El monto
 * se suma al existente; uno negativo lo descuenta.
 */
export const updateDeliveryBalance = async (id: string, amount: number): Promise<Delivery> => {
  const { data } = await http.patch<Delivery>(`/delivery/${id}/balance`, { amount });
  return data;
};

/** Baja lógica de un chofer. */
export const deleteDelivery = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/delivery/${id}`);
  return data;
};
