import type {
  AsientoDeAuditoria,
  Claim,
  Cylinder,
  Delivery,
  Distributor,
  Incident,
  Order,
  OrderRecord,
} from '../services/api/types';

/** Tono visual de una etiqueta (lo interpreta <Badge>). */
export type Tone = 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'primary' | 'accent';

export interface Label {
  text: string;
  tone: Tone;
}

type LabelMap<K extends string> = Record<K, Label>;

/**
 * Estado del pedido tal como lo devuelve la API. `OrderResponseDto` (listados)
 * trae `out_for_delivery`; `OrderRecordResponseDto` (reportes), `on_the_way`.
 */
export const ORDER_STATUS: LabelMap<Order['status'] | OrderRecord['status']> = {
  reserved: { text: 'Reservado', tone: 'accent' },
  pending: { text: 'Pendiente', tone: 'warn' },
  accepted: { text: 'Aceptado', tone: 'info' },
  out_for_delivery: { text: 'En camino', tone: 'primary' },
  on_the_way: { text: 'En camino', tone: 'primary' },
  delivered: { text: 'Entregado', tone: 'success' },
  cancelled: { text: 'Cancelado', tone: 'danger' },
};

export const PAYMENT_TYPE: LabelMap<Order['payment_method']> = {
  cash: { text: 'Efectivo', tone: 'neutral' },
  online: { text: 'Online', tone: 'info' },
};

export const PAYMENT_METHOD: LabelMap<OrderRecord['paymentMethod']> = {
  cash: { text: 'Efectivo', tone: 'neutral' },
  mercadopago: { text: 'MercadoPago', tone: 'info' },
  transfer: { text: 'Transferencia', tone: 'accent' },
};

export const CYLINDER_STATE: LabelMap<Cylinder['state']> = {
  in_depot: { text: 'En depósito', tone: 'neutral' },
  filled: { text: 'Lleno', tone: 'success' },
  dispatched: { text: 'Despachado', tone: 'primary' },
  with_customer: { text: 'Con el cliente', tone: 'info' },
  empty_returned: { text: 'Vacío devuelto', tone: 'warn' },
};

export const CLAIM_STATUS: LabelMap<Claim['status']> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  in_process: { text: 'En proceso', tone: 'info' },
  resolved: { text: 'Resuelto', tone: 'success' },
  rejected: { text: 'Rechazado', tone: 'danger' },
};

export const INCIDENT_TYPE: LabelMap<Incident['type']> = {
  damaged: { text: 'Envase dañado', tone: 'danger' },
  out_of_stock: { text: 'Sin stock', tone: 'warn' },
  no_show: { text: 'Cliente ausente', tone: 'accent' },
  other: { text: 'Otra', tone: 'neutral' },
};

export const INCIDENT_STATUS: LabelMap<Incident['status']> = {
  open: { text: 'Abierta', tone: 'warn' },
  resolved: { text: 'Resuelta', tone: 'success' },
};

export const DISTRIBUTOR_STATUS: LabelMap<Distributor['status']> = {
  active: { text: 'Activa', tone: 'success' },
  suspended: { text: 'Suspendida', tone: 'danger' },
};

export const AUDIT_RESULT: LabelMap<AsientoDeAuditoria['result']> = {
  success: { text: 'Exitosa', tone: 'success' },
  failure: { text: 'Fallida', tone: 'danger' },
};

/** Estado de una dependencia en /health y /health/ready (Terminus: 'up' | 'down'). */
export const HEALTH_STATUS: LabelMap<'up' | 'down'> = {
  up: { text: 'Operativo', tone: 'success' },
  down: { text: 'Caído', tone: 'danger' },
};

/** La etiqueta de un valor, o el valor crudo si la API agregó uno nuevo. */
export const labelOf = <K extends string>(map: LabelMap<K>, value: K | null | undefined): Label =>
  value && value in map ? map[value] : { text: value ?? '—', tone: 'neutral' };

/**
 * Estado de un chofer en una sola etiqueta, en el orden en que lo decide la
 * API para despacharle pedidos: validado (CU-032), habilitado por el admin y
 * conectado en su app.
 */
export const driverStatus = (driver: Pick<Delivery, 'validated' | 'isEnabled' | 'isAvailable'>): Label => {
  if (!driver.validated) return { text: 'Sin validar', tone: 'warn' };
  if (!driver.isEnabled) return { text: 'Deshabilitado', tone: 'danger' };
  if (!driver.isAvailable) return { text: 'Desconectado', tone: 'neutral' };
  return { text: 'En línea', tone: 'success' };
};
