import type {
  AsientoDeAuditoria,
  Claim,
  Cylinder,
  Delivery,
  Distributor,
  FleetExpirationEntry,
  FleetPlan,
  FleetTask,
  Incident,
  Order,
  OrderRecord,
  PurchaseOrder,
  PurchaseReceipt,
  StockAdjustment,
  StockBalance,
  StockMovement,
  Supplier,
  TruckLoad,
  Warehouse,
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

/** Los seis estados de un pedido, en el orden del flujo. */
export const ORDER_FLOW: Order['status'][] = [
  'reserved',
  'pending',
  'accepted',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const PAYMENT_METHOD: LabelMap<OrderRecord['paymentMethod']> = {
  cash: { text: 'Efectivo', tone: 'neutral' },
  mercadopago: { text: 'MercadoPago', tone: 'info' },
  transfer: { text: 'Transferencia', tone: 'accent' },
};

/** Estado del cobro de un pedido (`paymentStatus`). En efectivo arranca `pending` hasta que el chofer confirma. */
export const PAYMENT_STATUS: LabelMap<NonNullable<Order['paymentStatus']>> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  paid: { text: 'Cobrado', tone: 'success' },
  failed: { text: 'Rechazado', tone: 'danger' },
  unpaid: { text: 'Impago', tone: 'danger' },
  written_off: { text: 'Pérdida', tone: 'neutral' },
};

/** Los estados de cobro que se ofrecen como filtro, en el orden del circuito. */
export const PAYMENT_STATUS_ORDER: NonNullable<Order['paymentStatus']>[] = [
  'pending',
  'paid',
  'unpaid',
  'written_off',
  'failed',
];

export const CYLINDER_STATE: LabelMap<Cylinder['state']> = {
  in_depot: { text: 'En depósito', tone: 'neutral' },
  filled: { text: 'Lleno', tone: 'success' },
  dispatched: { text: 'Despachado', tone: 'primary' },
  with_customer: { text: 'Con el cliente', tone: 'info' },
  empty_returned: { text: 'Vacío devuelto', tone: 'warn' },
  retired: { text: 'Retirado', tone: 'danger' },
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
  unpaid_collection: { text: 'Cobro impago', tone: 'danger' },
  other: { text: 'Otra', tone: 'neutral' },
};

export const INCIDENT_STATUS: LabelMap<Incident['status']> = {
  open: { text: 'Abierta', tone: 'warn' },
  resolved: { text: 'Resuelta', tone: 'success' },
  discarded: { text: 'Descartada', tone: 'neutral' },
};

export const DISTRIBUTOR_STATUS: LabelMap<Distributor['status']> = {
  active: { text: 'Activa', tone: 'success' },
  suspended: { text: 'Suspendida', tone: 'danger' },
};

export const AUDIT_RESULT: LabelMap<AsientoDeAuditoria['result']> = {
  success: { text: 'Exitosa', tone: 'success' },
  failure: { text: 'Fallida', tone: 'danger' },
};

/** Estado de una tarea de la flota (plan de seguro/VTV/licencia/service contra un vehículo o chofer). */
export const FLEET_TASK_STATUS: LabelMap<FleetTask['status']> = {
  forecast: { text: 'Prevista', tone: 'neutral' },
  scheduled: { text: 'Programada', tone: 'info' },
  in_progress: { text: 'En proceso', tone: 'info' },
  done: { text: 'Hecha', tone: 'success' },
  overdue: { text: 'Vencida', tone: 'danger' },
  cancelled: { text: 'Cancelada', tone: 'neutral' },
};

/** Vigencia de una tarea según su vencimiento (null si no tiene fecha límite o ya está cerrada/cancelada). */
export const FLEET_EXPIRATION_STATUS: LabelMap<NonNullable<FleetTask['expirationStatus']>> = {
  current: { text: 'Vigente', tone: 'success' },
  due_soon: { text: 'Por vencer', tone: 'warn' },
  expired: { text: 'Vencido', tone: 'danger' },
};

/** Si la falta de esta tarea inhabilita o no al vehículo/chofer (CU-136/137/138). */
export const FLEET_TASK_CRITICALITY: LabelMap<FleetExpirationEntry['criticality']> = {
  blocking: { text: 'Bloqueante', tone: 'danger' },
  non_blocking: { text: 'No bloqueante', tone: 'neutral' },
};

/** A qué aplica un plan de mantenimiento/habilitación. */
export const FLEET_PLAN_SUBJECT: LabelMap<FleetPlan['subject']> = {
  vehicle: { text: 'Vehículo', tone: 'info' },
  driver: { text: 'Chofer', tone: 'accent' },
};

/** Qué dispara el vencimiento de un plan. */
export const FLEET_PLAN_TRIGGER: LabelMap<FleetPlan['trigger']> = {
  by_km: { text: 'Por kilometraje', tone: 'neutral' },
  by_time: { text: 'Por tiempo', tone: 'neutral' },
  by_fixed_date: { text: 'Fecha fija', tone: 'neutral' },
};

/** Estado de una dependencia en /health y /health/ready (Terminus: 'up' | 'down'). */
export const HEALTH_STATUS: LabelMap<'up' | 'down'> = {
  up: { text: 'Operativo', tone: 'success' },
  down: { text: 'Caído', tone: 'danger' },
};

/** Condición del stock físico de una garrafa. */
export const STOCK_CONDITION: LabelMap<StockBalance['condition']> = {
  full: { text: 'Llenas', tone: 'success' },
  empty: { text: 'Vacías', tone: 'neutral' },
  defective: { text: 'Defectuosas', tone: 'danger' },
};

export const WAREHOUSE_KIND: LabelMap<Warehouse['kind']> = {
  depot: { text: 'Galpón', tone: 'neutral' },
  branch: { text: 'Sucursal', tone: 'info' },
};

/** Motivo de un ajuste de stock (los últimos dos los genera el sistema: conteo inicial y conciliación). */
export const ADJUSTMENT_REASON: LabelMap<StockAdjustment['reason']> = {
  count_correction: { text: 'Corrección de conteo', tone: 'info' },
  shrinkage: { text: 'Merma', tone: 'warn' },
  leak: { text: 'Fuga', tone: 'danger' },
  damaged: { text: 'Rotura', tone: 'danger' },
  lost: { text: 'Pérdida', tone: 'danger' },
  found: { text: 'Encontrado', tone: 'success' },
  initial_count: { text: 'Conteo inicial', tone: 'primary' },
  reconciliation: { text: 'Conciliación', tone: 'accent' },
};

/** Los motivos que un administrador puede elegir al registrar un ajuste. */
export const MANUAL_ADJUSTMENT_REASONS: StockAdjustment['reason'][] = [
  'shrinkage',
  'leak',
  'damaged',
  'lost',
  'found',
  'count_correction',
];

export const MOVEMENT_REASON: LabelMap<StockMovement['reason']> = {
  initial_count: { text: 'Conteo inicial', tone: 'primary' },
  purchase_receipt: { text: 'Recepción de compra', tone: 'success' },
  plant_empty_out: { text: 'Vacías a la planta', tone: 'neutral' },
  truck_load: { text: 'Carga del camión', tone: 'info' },
  truck_return: { text: 'Vuelta del camión', tone: 'info' },
  delivery: { text: 'Entrega', tone: 'primary' },
  empty_collected: { text: 'Vacía recolectada', tone: 'neutral' },
  transfer: { text: 'Transferencia', tone: 'accent' },
  adjustment: { text: 'Ajuste', tone: 'warn' },
  shrinkage: { text: 'Merma', tone: 'warn' },
  condition_change: { text: 'Cambio de condición', tone: 'warn' },
  reversal: { text: 'Contraasiento', tone: 'danger' },
};

export const PURCHASE_ORDER_STATUS: LabelMap<PurchaseOrder['status']> = {
  draft: { text: 'Borrador', tone: 'neutral' },
  sent: { text: 'Enviada', tone: 'info' },
  partially_received: { text: 'Recibida parcial', tone: 'warn' },
  received: { text: 'Recibida', tone: 'success' },
  closed_short: { text: 'Cerrada con faltante', tone: 'accent' },
  cancelled: { text: 'Cancelada', tone: 'danger' },
};

export const RECEIPT_STATUS: LabelMap<PurchaseReceipt['status']> = {
  confirmed: { text: 'Confirmada', tone: 'success' },
  voided: { text: 'Anulada', tone: 'danger' },
};

export const RECEIPT_PAYMENT: LabelMap<PurchaseReceipt['paymentStatus']> = {
  unpaid: { text: 'Sin pagar', tone: 'warn' },
  paid: { text: 'Pagada', tone: 'success' },
};

export const SUPPLIER_DOCUMENT_TYPE: LabelMap<PurchaseReceipt['supplierDocumentType']> = {
  delivery_note: { text: 'Remito', tone: 'neutral' },
  invoice: { text: 'Factura', tone: 'neutral' },
};

export const SUPPLIER_KIND: LabelMap<Supplier['kind']> = {
  filling_plant: { text: 'Planta fraccionadora', tone: 'info' },
  other: { text: 'Otro', tone: 'neutral' },
};

export const TRUCK_LOAD_STATUS: LabelMap<TruckLoad['status']> = {
  loading: { text: 'Cargando', tone: 'warn' },
  on_route: { text: 'En ruta', tone: 'primary' },
  returned: { text: 'Volvió', tone: 'info' },
  closed: { text: 'Rendida', tone: 'success' },
  closed_with_difference: { text: 'Rendida con diferencia', tone: 'accent' },
  cancelled: { text: 'Cancelada', tone: 'danger' },
};

/** La etiqueta de un valor, o el valor crudo si la API agregó uno nuevo. */
export const labelOf = <K extends string>(map: LabelMap<K>, value: K | null | undefined): Label =>
  value && value in map ? map[value] : { text: value ?? '—', tone: 'neutral' };

/**
 * El cobro de un pedido. Una transferencia que no llegó es «No recibida» (el pago queda `failed`, que para un pago
 * online en general es «Rechazado»).
 */
export const paymentStatusLabel = (
  status: NonNullable<Order['paymentStatus']>,
  method?: Order['paymentMethodDetail'],
): Label =>
  status === 'failed' && method === 'transfer'
    ? { text: 'No recibida', tone: 'danger' }
    : labelOf(PAYMENT_STATUS, status);

/**
 * El texto del filtro «Cobro» para un estado: `failed` es «Rechazado» en MercadoPago y «No recibida» en una
 * transferencia, y el filtro trae los dos.
 */
export const paymentFilterLabel = (status: NonNullable<Order['paymentStatus']>): Label =>
  status === 'failed' ? { text: 'Rechazado / no recibida', tone: 'danger' } : labelOf(PAYMENT_STATUS, status);

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

/** Si una fila de `vehicle-history`/`assignments` es la asignación abierta o ya se liberó. */
export const vehicleAssignmentStatus = (releasedAt: string | null): Label =>
  releasedAt ? { text: 'Liberado', tone: 'neutral' } : { text: 'En uso', tone: 'success' };
