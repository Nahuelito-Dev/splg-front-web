import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import type {
  AssignCylindersBody,
  CreateCylinderBody,
  Cylinder,
  CylinderMovement,
  TransitionCylinderBody,
} from './types';

/**
 * Envases FÍSICOS (garrafas serializadas, `/cylinders`): cada fila es una
 * garrafa real con su ciclo de vida (depósito → llenado → reparto → cliente
 * → retorno). No confundir con `/gascylinder` (el tipo de producto del
 * catálogo, en `gasCylinders.ts`).
 */

export interface CylinderFilters {
  state?: Cylinder['state'];
  /** Los envases que salieron en este pedido. */
  orderId?: string;
  /** Los que tiene este cliente: es el `user_id` del cliente, no su `customer_id`. */
  customerUserId?: string;
}

/**
 * GET /cylinders: los envases de la distribuidora con filtros (estado, pedido, cliente). Con `params` pagina en el
 * servidor (limit/offset, total en X-Total-Count); sin `params` trae todos los que cumplen el filtro.
 */
export const listCylinders = async (filters: CylinderFilters = {}, params?: PageParams): Promise<Page<Cylinder>> =>
  toPage(await http.get<Cylinder[]>('/cylinders', { params: { ...filters, ...(params ? toQuery(params) : {}) } }));

/** GET /cylinders/:id: un envase puntual (404 si no existe o es de otra distribuidora). */
export const getCylinder = async (id: string): Promise<Cylinder> => {
  const { data } = await http.get<Cylinder>(`/cylinders/${id}`);
  return data;
};

/** POST /cylinders: alta de un envase, nace en `in_depot`. El serial es único por distribuidora (409 si se repite). */
export const createCylinder = async (body: CreateCylinderBody): Promise<Cylinder> => {
  const { data } = await http.post<Cylinder>('/cylinders', body);
  return data;
};

/** PATCH /cylinders/:id/transition: avanza el estado; el backend valida la máquina de estados (400 si es inválida). */
export const transitionCylinder = async (id: string, body: TransitionCylinderBody): Promise<Cylinder> => {
  const { data } = await http.patch<Cylinder>(`/cylinders/${id}/transition`, body);
  return data;
};

/** POST /cylinders/assign: asigna envases (por serial) a un pedido y los despacha (filled → dispatched). */
export const assignCylinders = async (body: AssignCylindersBody): Promise<Cylinder[]> => {
  const { data } = await http.post<Cylinder[]>('/cylinders/assign', body);
  return data;
};

/** GET /cylinders/:id/history: movimientos auditables del envase. */
export const getCylinderHistory = async (id: string): Promise<CylinderMovement[]> => {
  const { data } = await http.get<CylinderMovement[]>(`/cylinders/${id}/history`);
  return data;
};
