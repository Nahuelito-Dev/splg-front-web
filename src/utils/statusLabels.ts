import type { CylinderFilters } from '../services/api/physicalCylinders';
import type {
  AsientoDeAuditoria,
  Attendance,
  Car,
  CashBox,
  CashCategory,
  CashMovement,
  CashSession,
  CommissionEntry,
  CommissionRule,
  CustomerAccount,
  CustomerEntry,
  DriverLiquidation,
  DriverSettlement,
  Claim,
  Cylinder,
  CylinderInspection,
  CylinderVigencia,
  Delivery,
  Distributor,
  SupportSession,
  Ticket,
  DocumentReading,
  FleetExpirationEntry,
  FleetPlan,
  FleetTask,
  FuelLoad,
  Incident,
  InsuranceInstallment,
  InsurancePolicy,
  Leave,
  MpItemStatus,
  LedgerPaymentStatus,
  MpReconciliationStatus,
  Order,
  OrderPaymentState,
  OrderRecord,
  PurchaseOrder,
  Refund,
  PurchaseReceipt,
  StockAdjustment,
  StockBalance,
  StockMovement,
  Supplier,
  Tire,
  ProcessRun,
  ProcessSummaryItem,
  TireEvent,
  TrafficFine,
  TruckLoad,
  VehicleAccident,
  Warehouse,
  AssistantPreview,
  AssistantSource,
  RegressionCase,
  RegressionCaseResult,
  RegressionRun,
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
  reserved: { text: 'Reservado', tone: 'neutral' },
  pending: { text: 'Pendiente', tone: 'warn' },
  accepted: { text: 'Aceptado', tone: 'info' },
  out_for_delivery: { text: 'En camino', tone: 'info' },
  on_the_way: { text: 'En camino', tone: 'info' },
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
  account: { text: 'Cuenta corriente', tone: 'info' },
};

/** Estado del cobro de un pedido (`paymentStatus`). En efectivo arranca `pending` hasta que el chofer confirma. */
export const PAYMENT_STATUS: LabelMap<NonNullable<Order['paymentStatus']>> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  paid: { text: 'Cobrado', tone: 'success' },
  failed: { text: 'Rechazado', tone: 'danger' },
  unpaid: { text: 'Impago', tone: 'danger' },
  written_off: { text: 'Pérdida', tone: 'neutral' },
};

/**
 * Tono de cada uno de los nueve estados de pago de Mercado Pago. El TEXTO lo arma el back (`paymentStatusLabel`):
 * el panel no lo reinterpreta, sólo elige el color.
 */
export const MERCADOPAGO_PAYMENT_TONE: Record<LedgerPaymentStatus, Tone> = {
  pending: 'warn',
  in_process: 'warn',
  authorized: 'warn',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
  charged_back: 'danger',
  in_mediation: 'danger',
};

/**
 * La etiqueta del pago de Mercado Pago de un pedido: el texto del back con el tono de su estado; `null` si no tiene.
 * Un contracargo reintegrado (`reimbursed`: Mercado Pago devolvió el dinero al comercio y la caja ya tiene el ingreso)
 * deja de ser un problema: tono neutro. El resto de los contracargos (dinero retenido, también `in_process`) es peligro,
 * igual que el egreso que asentó la caja.
 */
export const mercadoPagoPaymentLabel = (
  state:
    | (Pick<OrderPaymentState, 'paymentStatus' | 'paymentStatusLabel'> &
        Partial<Pick<OrderPaymentState, 'paymentStatusDetail' | 'paymentFraudHold'>>)
    | undefined,
): Label | null => {
  // Un pedido retenido por una alerta de fraude se ve primero: es lo que pide acción.
  if (state?.paymentFraudHold) return { text: 'Retenido por fraude', tone: 'danger' };
  if (!state?.paymentStatus || !state.paymentStatusLabel) return null;
  const contracargo = state.paymentStatus === 'charged_back' ? state.paymentStatusDetail : undefined;
  // Contracargo: sólo `settled` (dinero retenido, egreso en la caja) es peligro; `in_process` (disputa abierta, el monto
  // queda en espera: la caja no se toca) es ámbar; `reimbursed` (dinero reintegrado), neutro.
  const tone: Tone =
    contracargo === 'reimbursed'
      ? 'neutral'
      : contracargo === 'in_process'
        ? 'warn'
        : MERCADOPAGO_PAYMENT_TONE[state.paymentStatus];
  return { text: state.paymentStatusLabel, tone };
};

/** Los estados de cobro que se ofrecen como filtro, en el orden del circuito. */
export const PAYMENT_STATUS_ORDER: NonNullable<Order['paymentStatus']>[] = [
  'pending',
  'paid',
  'unpaid',
  'written_off',
  'failed',
];

/** Modalidad de entrega del pedido (CU-148). */
export const DELIVERY_MODE: LabelMap<Order['deliveryMode']> = {
  standard: { text: 'Programada', tone: 'neutral' },
  express: { text: 'Express', tone: 'accent' },
};

/** Una conciliación con Mercado Pago: espera el reporte, ya se comparó con la caja o falló. */
export const MP_RECONCILIATION_STATUS: LabelMap<MpReconciliationStatus> = {
  requested: { text: 'Esperando a Mercado Pago', tone: 'warn' },
  ready: { text: 'Lista', tone: 'success' },
  failed: { text: 'Fallida', tone: 'danger' },
};

/**
 * Una lectura de documento (M6): lo que hizo el lector y, si hubo propuesta, qué decidió el administrador. «Sin
 * lector» es la cola sin servicio configurado; «Falló» se reintenta sola hasta agotar los intentos.
 */
export const DOCUMENT_READING_STATUS: LabelMap<DocumentReading['status']> = {
  proposed: { text: 'Por revisar', tone: 'warn' },
  read: { text: 'Leída', tone: 'info' },
  pending: { text: 'Sin lector', tone: 'neutral' },
  unreadable: { text: 'Ilegible', tone: 'danger' },
  duplicate: { text: 'Duplicada', tone: 'warn' },
  failed: { text: 'Falló', tone: 'danger' },
  confirmed: { text: 'Confirmada', tone: 'success' },
  corrected: { text: 'Corregida', tone: 'success' },
  rejected: { text: 'Rechazada', tone: 'neutral' },
};

/** Salud de un proceso automático: el estado de su última corrida más las alertas (atrasado, colgado). */
export const PROCESS_HEALTH: LabelMap<ProcessSummaryItem['health']> = {
  ok: { text: 'Al día', tone: 'success' },
  partial: { text: 'Con errores', tone: 'warn' },
  running: { text: 'Corriendo', tone: 'info' },
  failed: { text: 'Falló', tone: 'danger' },
  late: { text: 'Atrasado', tone: 'warn' },
  stuck: { text: 'Colgado', tone: 'danger' },
  never: { text: 'Sin corridas', tone: 'neutral' },
};

/** Resultado de una corrida del historial. */
export const PROCESS_RUN_STATUS: LabelMap<ProcessRun['status']> = {
  running: { text: 'Corriendo', tone: 'info' },
  ok: { text: 'Correcta', tone: 'success' },
  partial: { text: 'Con errores', tone: 'warn' },
  failed: { text: 'Falló', tone: 'danger' },
  skipped: { text: 'Salteada (otra instancia)', tone: 'neutral' },
};

/** Quién disparó una corrida del historial. */
export const PROCESS_RUN_TRIGGER: Record<ProcessRun['trigger'], string> = {
  cron: 'Programada',
  manual: 'Manual',
  webhook: 'Webhook',
};

/** Una diferencia de la conciliación: falta asentarla o ya se asentó. */
export const MP_ITEM_STATUS: LabelMap<MpItemStatus> = {
  pending: { text: 'Sin asentar', tone: 'warn' },
  applied: { text: 'Asentada', tone: 'success' },
};

/** Estado de una devolución a la pasarela (CU-168). */
export const REFUND_STATUS: LabelMap<Refund['status']> = {
  pending: { text: 'En curso', tone: 'info' },
  succeeded: { text: 'Reintegrado', tone: 'success' },
  failed: { text: 'Falló', tone: 'danger' },
};

/** Qué parte del pago se devuelve. */
export const REFUND_KIND: LabelMap<Refund['kind']> = {
  full: { text: 'Pago completo', tone: 'neutral' },
  express_surcharge: { text: 'Recargo express', tone: 'accent' },
};

export const CYLINDER_STATE: LabelMap<Cylinder['state']> = {
  in_depot: { text: 'En depósito', tone: 'neutral' },
  filled: { text: 'Lleno', tone: 'success' },
  dispatched: { text: 'Despachado', tone: 'primary' },
  with_customer: { text: 'Con el cliente', tone: 'info' },
  empty_returned: { text: 'Vacío devuelto', tone: 'warn' },
  retired: { text: 'Retirado', tone: 'danger' },
};

export const CYLINDER_VIGENCIA: LabelMap<CylinderVigencia['status']> = {
  valid: { text: 'Vigente', tone: 'success' },
  expired: { text: 'Vencido', tone: 'danger' },
  unverified: { text: 'Sin revisión registrada', tone: 'neutral' },
};

/** Opciones del filtro de vigencia del listado: los tres estados y «Despachables» (vigentes + sin revisión registrada). */
export const VIGENCIA_FILTER_LABEL: Record<NonNullable<CylinderFilters['vigencia']>, string> = {
  valid: 'Vigentes',
  expired: 'Vencidos',
  unverified: 'Sin revisión registrada',
  dispatchable: 'Despachables (vigentes y sin revisión)',
};

export const INSPECTION_RESULT: LabelMap<CylinderInspection['result']> = {
  approved: { text: 'Aprobada', tone: 'success' },
  conditional: { text: 'Condicional', tone: 'warn' },
  rejected: { text: 'Rechazada', tone: 'danger' },
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

/** Tipo de un rol del personal (F37): el de sistema viene con la empresa y tiene todos los permisos. */
export const STAFF_ROLE_KIND: LabelMap<'system' | 'custom'> = {
  system: { text: 'Sistema', tone: 'info' },
  custom: { text: 'Personalizado', tone: 'neutral' },
};

/** Estado de un pedido o sesión de soporte (`support_session.status`). */
export const SUPPORT_SESSION_STATUS: LabelMap<SupportSession['status']> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  active: { text: 'Activa', tone: 'accent' },
  rejected: { text: 'Rechazada', tone: 'neutral' },
  expired_request: { text: 'Sin respuesta', tone: 'neutral' },
  cancelled: { text: 'Retirada', tone: 'neutral' },
  ended: { text: 'Finalizada', tone: 'neutral' },
  revoked: { text: 'Revocada', tone: 'danger' },
  expired: { text: 'Vencida', tone: 'neutral' },
};

/** Lo que un acceso de soporte ve además de lo básico (el alcance pedido). */
export const SUPPORT_SCOPE: LabelMap<SupportSession['scope'][number]> = {
  personal_data: { text: 'Datos personales', tone: 'warn' },
  files: { text: 'Archivos', tone: 'warn' },
  exports: { text: 'Exportes', tone: 'warn' },
};

/** Estado de un ticket de soporte (C1b, §4.2.2 del diseño de comunicación). */
export const TICKET_STATUS: LabelMap<Ticket['status']> = {
  new: { text: 'Nuevo', tone: 'info' },
  open: { text: 'En curso', tone: 'primary' },
  waiting_company: { text: 'Esperando a la empresa', tone: 'warn' },
  resolved: { text: 'Resuelto', tone: 'success' },
  closed: { text: 'Cerrado', tone: 'neutral' },
};

export const TICKET_PRIORITY: LabelMap<Ticket['priority']> = {
  low: { text: 'Baja', tone: 'neutral' },
  normal: { text: 'Normal', tone: 'info' },
  high: { text: 'Alta', tone: 'warn' },
  urgent: { text: 'Urgente', tone: 'danger' },
};

export const TICKET_CATEGORY: LabelMap<Ticket['category']> = {
  billing: { text: 'Facturación', tone: 'neutral' },
  technical: { text: 'Técnico', tone: 'neutral' },
  module: { text: 'Funciones', tone: 'neutral' },
  data: { text: 'Datos', tone: 'neutral' },
  account: { text: 'Cuenta', tone: 'neutral' },
  other: { text: 'Otro', tone: 'neutral' },
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
  employee: { text: 'Personal', tone: 'primary' },
};

/** Tipo de documento de un plan: define el formulario que se muestra al cargarlo (CU-183 a CU-185). */
export const FLEET_DOCUMENT_KIND: LabelMap<NonNullable<FleetPlan['documentKind']>> = {
  insurance: { text: 'Seguro', tone: 'info' },
  vtv: { text: 'VTV', tone: 'info' },
  hazmat_vehicle_permit: { text: 'Habilitación de mercancías peligrosas (vehículo)', tone: 'info' },
  driver_license: { text: 'Licencia de conducir', tone: 'accent' },
  hazmat_driver_course: { text: 'Curso de mercancías peligrosas', tone: 'primary' },
  psychophysical: { text: 'Examen psicofísico', tone: 'primary' },
  art_coverage: { text: 'Alta en la ART', tone: 'primary' },
  service: { text: 'Service', tone: 'neutral' },
  generic: { text: 'Genérico', tone: 'neutral' },
};

/** Estado de una licencia o ausencia (CU-191, CU-192, CU-317, CU-318). */
export const LEAVE_STATUS: LabelMap<Leave['status']> = {
  requested: { text: 'Solicitada', tone: 'warn' },
  approved: { text: 'Aprobada', tone: 'success' },
  rejected: { text: 'Rechazada', tone: 'danger' },
  cancelled: { text: 'Cancelada', tone: 'neutral' },
};

/** Tipo de licencia o ausencia. */
export const LEAVE_TYPE: Record<Leave['type'], string> = {
  vacation: 'Vacaciones',
  sick: 'Enfermedad',
  work_accident: 'Accidente de trabajo',
  study: 'Estudio',
  marriage: 'Matrimonio',
  birth: 'Nacimiento',
  bereavement: 'Duelo',
  unpaid: 'Sin goce de sueldo',
  suspension: 'Suspensión',
  unjustified_absence: 'Ausencia injustificada',
  other: 'Otra',
};

/** De dónde salió la marca de una jornada (CU-189, CU-190). */
export const ATTENDANCE_SOURCE: LabelMap<Attendance['source']> = {
  panel: { text: 'Panel', tone: 'neutral' },
  driver_app: { text: 'App del chofer', tone: 'info' },
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
/** Estado de flota del vehículo: «fuera de servicio» es el que deja un siniestro (se vuelve con Reactivar). */
export const CAR_FLEET_STATUS: LabelMap<Car['fleet_status']> = {
  active: { text: 'Activo', tone: 'success' },
  in_service: { text: 'En taller', tone: 'info' },
  grounded: { text: 'Fuera de servicio', tone: 'danger' },
};

export const FUEL_TYPE: LabelMap<NonNullable<Car['fuel_type']>> = {
  diesel: { text: 'Gasoil', tone: 'neutral' },
  gasoline: { text: 'Nafta', tone: 'neutral' },
  cng: { text: 'GNC', tone: 'neutral' },
  lpg: { text: 'GLP', tone: 'neutral' },
};

export const FUEL_PAYMENT_METHOD: LabelMap<FuelLoad['paymentMethod']> = {
  cash_box: { text: 'Caja', tone: 'neutral' },
  driver_cash: { text: 'Efectivo del chofer', tone: 'neutral' },
  card: { text: 'Tarjeta', tone: 'neutral' },
  fuel_account: { text: 'Cuenta corriente de combustible', tone: 'neutral' },
};

/** Ciclo de la multa: pagada y anulada no vuelven atrás. */
export const TRAFFIC_FINE_STATUS: LabelMap<TrafficFine['status']> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  appealed: { text: 'Apelada', tone: 'info' },
  paid: { text: 'Pagada', tone: 'success' },
  voided: { text: 'Anulada', tone: 'neutral' },
};

/** Estado de la póliza según su vigencia; cancelada no vuelve atrás. */
export const INSURANCE_POLICY_STATUS: LabelMap<InsurancePolicy['status']> = {
  active: { text: 'Vigente', tone: 'success' },
  upcoming: { text: 'Futura', tone: 'info' },
  expired: { text: 'Vencida', tone: 'neutral' },
  cancelled: { text: 'Cancelada', tone: 'neutral' },
};

/** Ciclo de una cuota del seguro. El tono de la pendiente según su plazo lo da `installmentLabel`. */
export const INSURANCE_INSTALLMENT_STATUS: LabelMap<InsuranceInstallment['status']> = {
  pending: { text: 'Pendiente', tone: 'warn' },
  paid: { text: 'Paga', tone: 'success' },
  cancelled: { text: 'Cancelada', tone: 'neutral' },
};

/** Ciclo del siniestro: denunciado, en revisión, en reparación y cerrado. */
export const ACCIDENT_STATUS: LabelMap<VehicleAccident['status']> = {
  reported: { text: 'Denunciado', tone: 'warn' },
  under_review: { text: 'En revisión', tone: 'info' },
  repairing: { text: 'En reparación', tone: 'primary' },
  closed: { text: 'Cerrado', tone: 'success' },
};

export const TIRE_STATUS: LabelMap<Tire['status']> = {
  in_stock: { text: 'En depósito', tone: 'neutral' },
  mounted: { text: 'Montado', tone: 'success' },
  retired: { text: 'Dado de baja', tone: 'danger' },
};

export const TIRE_EVENT_TYPE: LabelMap<TireEvent['type']> = {
  mount: { text: 'Montaje', tone: 'success' },
  unmount: { text: 'Desmontaje', tone: 'neutral' },
  rotate: { text: 'Rotación', tone: 'info' },
  retread: { text: 'Recapado', tone: 'accent' },
  retire: { text: 'Baja', tone: 'danger' },
};

/** Los estados de un mapa de etiquetas, en el orden en que está declarado. */
export const statusKeys = <K extends string>(map: LabelMap<K>): K[] => Object.keys(map) as K[];

/** El estado que viene de la URL si es uno del mapa; cualquier otro valor (enlace viejo o escrito a mano) es «todos» (vacío). */
export const statusParam = <K extends string>(map: LabelMap<K>, value: string): K | '' =>
  statusKeys(map).find((key) => key === value) ?? '';

/** Las opciones («Pendiente», tono) de un mapa de etiquetas, para las pestañas por estado de un listado. */
export const statusOptions = <K extends string>(map: LabelMap<K>): { value: K; label: string; tone: Tone }[] =>
  statusKeys(map).map((value) => ({ value, label: map[value].text, tone: map[value].tone }));

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
 * Si el pedido está pagado, dicho para una etiqueta suelta al lado del estado del pedido: «Pendiente» solo se
 * confundiría con el estado del pedido, así que el pendiente es «Sin pagar» y el cobrado, «Pagado».
 */
export const paidLabel = (
  status: NonNullable<Order['paymentStatus']>,
  method?: Order['paymentMethodDetail'],
): Label => {
  if (status === 'pending') return { text: 'Sin pagar', tone: 'warn' };
  if (status === 'paid') return { text: 'Pagado', tone: 'success' };
  return paymentStatusLabel(status, method);
};

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

// ── Finanzas ────────────────────────────────────────────────────────────────

export const CASH_BOX_KIND: LabelMap<CashBox['kind']> = {
  cash: { text: 'Efectivo', tone: 'success' },
  bank: { text: 'Banco', tone: 'info' },
  wallet: { text: 'Billetera', tone: 'accent' },
};

export const CASH_SESSION_STATUS: LabelMap<CashSession['status']> = {
  open: { text: 'Abierta', tone: 'success' },
  closed: { text: 'Cerrada', tone: 'neutral' },
};

export const CASH_DIRECTION: LabelMap<CashMovement['direction']> = {
  in: { text: 'Entrada', tone: 'success' },
  out: { text: 'Salida', tone: 'danger' },
};

export const CATEGORY_DIRECTION: LabelMap<CashCategory['direction']> = {
  income: { text: 'Ingreso', tone: 'success' },
  expense: { text: 'Gasto', tone: 'danger' },
};

export const CASH_METHOD: LabelMap<CashMovement['method']> = {
  cash: { text: 'Efectivo', tone: 'neutral' },
  transfer: { text: 'Transferencia', tone: 'accent' },
  card: { text: 'Tarjeta', tone: 'info' },
  mercadopago: { text: 'MercadoPago', tone: 'info' },
  check: { text: 'Cheque', tone: 'neutral' },
};

export const CASH_REFERENCE: LabelMap<CashMovement['referenceType']> = {
  manual: { text: 'Manual', tone: 'neutral' },
  session_opening: { text: 'Apertura de caja', tone: 'info' },
  session_closing: { text: 'Cierre de caja', tone: 'info' },
  driver_settlement: { text: 'Rendición', tone: 'primary' },
  customer_payment: { text: 'Cobro de cuenta', tone: 'primary' },
  order_payment: { text: 'Cobro de pedido', tone: 'primary' },
  order_transfer: { text: 'Transferencia de pedido', tone: 'primary' },
  payment: { text: 'Cobro de Mercado Pago', tone: 'primary' },
  payment_fee: { text: 'Comisión de Mercado Pago', tone: 'neutral' },
  payment_refund: { text: 'Devolución a cliente', tone: 'warn' },
  payment_external_refund: { text: 'Devolución de Mercado Pago', tone: 'warn' },
  order_deposit: { text: 'Seña de reserva', tone: 'primary' },
  mp_reconciliation: { text: 'Conciliación con Mercado Pago', tone: 'accent' },
  purchase_receipt: { text: 'Compra', tone: 'neutral' },
  fuel_load: { text: 'Combustible', tone: 'neutral' },
  traffic_fine: { text: 'Multa', tone: 'neutral' },
  insurance_installment: { text: 'Cuota de seguro', tone: 'neutral' },
  maintenance_task: { text: 'Mantenimiento de flota', tone: 'neutral' },
  tire: { text: 'Neumático', tone: 'neutral' },
  vehicle_accident: { text: 'Siniestro', tone: 'neutral' },
  insurance_reimbursement: { text: 'Reintegro de seguro', tone: 'primary' },
  driver_liquidation: { text: 'Liquidación', tone: 'primary' },
  box_transfer: { text: 'Transferencia entre cajas', tone: 'accent' },
  reversal: { text: 'Anulación', tone: 'warn' },
};

export const SETTLEMENT_STATUS: LabelMap<DriverSettlement['status']> = {
  open: { text: 'Abierta', tone: 'warn' },
  submitted: { text: 'Presentada', tone: 'info' },
  approved: { text: 'Aprobada', tone: 'success' },
};

export const DIFFERENCE_RESOLUTION: LabelMap<NonNullable<DriverSettlement['differenceResolution']>> = {
  none: { text: 'Sin diferencia', tone: 'neutral' },
  absorbed: { text: 'Absorbida', tone: 'neutral' },
  charged_to_driver: { text: 'A cargo del chofer', tone: 'warn' },
};

export const ACCOUNT_STATUS: LabelMap<CustomerAccount['status']> = {
  active: { text: 'Activa', tone: 'success' },
  blocked: { text: 'Bloqueada', tone: 'warn' },
  closed: { text: 'Cerrada', tone: 'neutral' },
};

export const TAX_CONDITION: LabelMap<CustomerAccount['taxCondition']> = {
  registered: { text: 'Responsable inscripto', tone: 'neutral' },
  monotax: { text: 'Monotributo', tone: 'neutral' },
  exempt: { text: 'Exento', tone: 'neutral' },
  final_consumer: { text: 'Consumidor final', tone: 'neutral' },
};

export const CUSTOMER_ENTRY_TYPE: LabelMap<CustomerEntry['type']> = {
  sale_charge: { text: 'Venta', tone: 'danger' },
  payment: { text: 'Pago', tone: 'success' },
  credit_note: { text: 'Nota de crédito', tone: 'success' },
  debit_note: { text: 'Nota de débito', tone: 'danger' },
};

export const COMMISSION_BASIS: LabelMap<CommissionRule['basis']> = {
  per_unit: { text: 'Por garrafa', tone: 'neutral' },
  per_order: { text: 'Por pedido', tone: 'neutral' },
  percent_of_total: { text: '% del subtotal', tone: 'neutral' },
};

export const COMMISSION_ENTRY_TYPE: LabelMap<CommissionEntry['type']> = {
  delivery_commission: { text: 'Comisión por entrega', tone: 'success' },
  settlement_shortage: { text: 'Faltante de rendición', tone: 'danger' },
  traffic_fine: { text: 'Multa', tone: 'danger' },
  adjustment: { text: 'Ajuste', tone: 'warn' },
  legacy_balance: { text: 'Saldo heredado', tone: 'neutral' },
};

export const LIQUIDATION_STATUS: LabelMap<DriverLiquidation['status']> = {
  draft: { text: 'Borrador', tone: 'warn' },
  approved: { text: 'Aprobada', tone: 'info' },
  paid: { text: 'Pagada', tone: 'success' },
  voided: { text: 'Anulada', tone: 'neutral' },
};

/** Quién armó la respuesta del probador: la capa con IA o las respuestas fijas (la IA no corrió). */
export const ASSISTANT_LAYER: LabelMap<AssistantPreview['layer']> = {
  ai: { text: 'Con IA', tone: 'info' },
  fixed: { text: 'Respuestas fijas', tone: 'warn' },
};

/** De dónde sacó el asistente lo que contesta. */
export const ASSISTANT_SOURCE_TYPE: LabelMap<AssistantSource['type']> = {
  faq: { text: 'Pregunta frecuente', tone: 'primary' },
  order: { text: 'Pedidos del cliente', tone: 'neutral' },
  catalog: { text: 'Precios', tone: 'neutral' },
  schedule: { text: 'Horarios y zonas', tone: 'neutral' },
  payment_methods: { text: 'Medios de pago', tone: 'neutral' },
  tool: { text: 'Consulta del sistema', tone: 'neutral' },
};

/** Qué se espera de un caso del lote de pruebas. */
export const REGRESSION_EXPECTED: LabelMap<RegressionCase['expected']> = {
  answer: { text: 'Que responda', tone: 'success' },
  handoff: { text: 'Que pase a una persona', tone: 'info' },
};

export const REGRESSION_RUN_STATUS: LabelMap<RegressionRun['status']> = {
  running: { text: 'En curso', tone: 'info' },
  finished: { text: 'Terminada', tone: 'success' },
  failed: { text: 'Se cortó', tone: 'danger' },
};

export const REGRESSION_OUTCOME: LabelMap<RegressionCaseResult['outcome']> = {
  passed: { text: 'Pasó', tone: 'success' },
  failed: { text: 'No pasó', tone: 'danger' },
  error: { text: 'Sin juzgar', tone: 'warn' },
};

/** Una pregunta frecuente sin respuesta todavía: no la usa el asistente hasta completarla. */
export const FAQ_DRAFT: Label = { text: 'Borrador', tone: 'warn' };
