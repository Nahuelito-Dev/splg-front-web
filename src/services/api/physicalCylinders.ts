import { privateAxiosInstance } from './axiosConfig';

/**
 * Envase FÍSICO (garrafa serializada) — módulo `/cylinders` del backend. NO
 * confundir con `/gascylinder` (el TIPO de producto del catálogo). Cada fila es
 * una garrafa real con su ciclo de vida físico.
 */
export type CylinderState =
  | 'in_depot'
  | 'filled'
  | 'dispatched'
  | 'with_customer'
  | 'empty_returned';

export interface PhysicalCylinder {
  cylinder_id: string;
  distributor_id: string;
  serial: string;
  gas_cylinder_id?: string | null;
  state: CylinderState;
  current_customer_id?: string | null;
  current_order_id?: string | null;
  deposit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CylinderMovement {
  movement_id: string;
  cylinder_id: string;
  from_state: CylinderState | null;
  to_state: CylinderState;
  order_id?: string | null;
  actor_user_id?: string | null;
  note?: string | null;
  createdAt: string;
}

// GET ALL — envases del tenant, opcionalmente filtrados por estado.
export const getPhysicalCylinders = async (state?: CylinderState) => {
  const url = state ? `/cylinders?state=${state}` : '/cylinders';
  const { data } = await privateAxiosInstance.get<PhysicalCylinder[]>(url);
  return data;
};

// CREATE — alta de un envase físico (nace en IN_DEPOT).
export const createPhysicalCylinder = async (payload: {
  serial: string;
  gasCylinderId?: string;
  deposit?: number;
}) => {
  const { data } = await privateAxiosInstance.post<PhysicalCylinder>(
    '/cylinders',
    {
      serial: payload.serial,
      gasCylinderId: payload.gasCylinderId || undefined,
      deposit: payload.deposit !== undefined ? Number(payload.deposit) : 0,
    },
  );
  return data;
};

// TRANSITION — avanza el estado del envase (valida contra la máquina de estados).
export const transitionPhysicalCylinder = async (
  id: string,
  toState: CylinderState,
  note?: string,
) => {
  const { data } = await privateAxiosInstance.patch<PhysicalCylinder>(
    `/cylinders/${id}/transition`,
    { toState, note: note || undefined },
  );
  return data;
};

// HISTORY — movimientos auditables del envase.
export const getCylinderHistory = async (id: string) => {
  const { data } = await privateAxiosInstance.get<CylinderMovement[]>(
    `/cylinders/${id}/history`,
  );
  return data;
};

// ASSIGN — asigna seriales a un pedido y los despacha (FILLED→DISPATCHED).
export const assignCylindersToOrder = async (
  orderId: string,
  serials: string[],
) => {
  const { data } = await privateAxiosInstance.post<PhysicalCylinder[]>(
    '/cylinders/assign',
    { orderId, serials },
  );
  return data;
};
