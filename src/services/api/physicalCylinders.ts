import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import type {
  AssignCylindersBody,
  CreateCylinderBody,
  Cylinder,
  CylinderMovement,
  CylinderVigencia,
  ExpiringCylinders,
  RegisterInspectionBody,
  RetireCylinderBody,
  TransitionCylinderBody,
  UpdateCylinderBody,
} from './types';

/**
 * `PATCH /cylinders/:id` acepta `null` para limpiar el producto o una fecha (probado contra la API), aunque el Swagger
 * no lo declare como nullable.
 */
export type UpdateCylinderPatch = { [K in keyof UpdateCylinderBody]: UpdateCylinderBody[K] | null };

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
  /** Vigencia de la revisión: `valid`, `expired` (no se puede despachar) o `unverified` (sin revisión registrada) o `dispatchable` (vigentes + sin revisión: los que se pueden asignar). */
  vigencia?: CylinderVigencia['status'] | 'dispatchable';
  /** Tipo de producto del envase. */
  gasCylinderId?: string;
}

/** Los parámetros de GET /cylinders sin paginar: los mismos que usa el exporte completo. */
export const cylinderQuery = (filters: CylinderFilters = {}) => ({ ...filters });

/**
 * GET /cylinders: los envases de la distribuidora con filtros (estado, pedido, cliente, vigencia, producto). Con `params` pagina en el
 * servidor (limit/offset, total en X-Total-Count); sin `params` trae todos los que cumplen el filtro.
 */
export const listCylinders = async (filters: CylinderFilters = {}, params?: PageParams): Promise<Page<Cylinder>> =>
  toPage(
    await http.get<Cylinder[]>('/cylinders', {
      params: { ...cylinderQuery(filters), ...(params ? toQuery(params) : {}) },
    }),
  );

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

/** PATCH /cylinders/:id: datos maestros del envase. 409 si el serial ya existe o el envase está retirado. */
export const updateCylinder = async (id: string, body: UpdateCylinderPatch): Promise<Cylinder> => {
  const { data } = await http.patch<Cylinder>(`/cylinders/${id}`, body);
  return data;
};

/**
 * PATCH /cylinders/:id/retire: baja lógica con motivo (queda en el historial). Sólo desde `in_depot` o
 * `empty_returned` (400 desde otro estado). El envase no se borra: pasa a `retired`.
 */
export const retireCylinder = async (id: string, body: RetireCylinderBody): Promise<Cylinder> => {
  const { data } = await http.patch<Cylinder>(`/cylinders/${id}/retire`, body);
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

/**
 * GET /cylinders/vigencia/serial/:serial (CU-133): la vigencia a partir del número de serie grabado en el envase. El
 * serial es único por distribuidora: el administrador general necesita una elegida (400 si no). 404 si no existe.
 */
export const getCylinderVigenciaBySerial = async (serial: string): Promise<CylinderVigencia> => {
  const { data } = await http.get<CylinderVigencia>(`/cylinders/vigencia/serial/${encodeURIComponent(serial)}`);
  return data;
};

/** GET /cylinders/:id/vigencia: fabricación, última revisión, vencimiento, días que faltan e historial de revisiones. */
export const getCylinderVigencia = async (id: string): Promise<CylinderVigencia> => {
  const { data } = await http.get<CylinderVigencia>(`/cylinders/${id}/vigencia`);
  return data;
};

/**
 * POST /cylinders/:id/inspections: registra la revisión periódica. Un rechazo deja el vencimiento en la fecha de la
 * revisión (el envase queda bloqueado para el despacho). 400 por fecha futura o vencimiento faltante/no posterior;
 * 409 si el envase está dado de baja.
 */
export const registerInspection = async (id: string, body: RegisterInspectionBody): Promise<CylinderVigencia> => {
  const { data } = await http.post<CylinderVigencia>(`/cylinders/${id}/inspections`, body);
  return data;
};

/** GET /cylinders/vigencia/proximos-a-vencer: vencidos, por vencer en `days` días y sin revisión registrada. */
export const listExpiringCylinders = async (
  days: number,
  page: { limit: number; offset: number },
): Promise<ExpiringCylinders> => {
  const { data } = await http.get<ExpiringCylinders>('/cylinders/vigencia/proximos-a-vencer', {
    params: { days, ...page },
  });
  return data;
};
