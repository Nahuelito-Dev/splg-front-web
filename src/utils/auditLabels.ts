import type { Label } from './statusLabels';

/** Entidades que registra la auditoría de datos, con el nombre que se le muestra a la persona. */
export const AUDIT_ENTITY = {
  Admin: 'Administrador',
  Attachment: 'Adjunto',
  Car: 'Vehículo',
  Claim: 'Reclamo',
  CoverageZone: 'Zona de cobertura',
  Customer: 'Cliente',
  Cylinder: 'Envase físico',
  CylinderInspection: 'Inspección de envase',
  CylinderRecoveryCase: 'Caso de recupero de envase',
  CylinderRecoveryNotice: 'Aviso de recupero de envase',
  Delivery: 'Chofer',
  Distributor: 'Distribuidora',
  DistributorTheme: 'Apariencia de la distribuidora',
  Employee: 'Legajo de personal',
  GasCylinder: 'Garrafa (producto)',
  GasCylinderPromotion: 'Promoción de garrafa',
  Incident: 'Incidencia',
  JobPosition: 'Puesto de trabajo',
  MaintenancePlan: 'Plan de flota',
  MaintenanceTask: 'Tarea de flota',
  MaintenanceTaskAttachment: 'Adjunto de tarea',
  MaintenanceWindowProposal: 'Propuesta de ventana de mantenimiento',
  ModuleConfig: 'Configuración de procesos automáticos',
  Order: 'Pedido',
  OrderAddressChange: 'Cambio de dirección del pedido',
  OrderItem: 'Renglón de pedido',
  Payment: 'Pago',
  Rating: 'Calificación',
  RepurchaseInvitation: 'Invitación de recompra',
  RepurchaseOffset: 'Ajuste de recompra del cliente',
  Role: 'Rol',
  Sesion: 'Sesión',
  RouteBatch: 'Lote de ruta',
  RouteBatchStop: 'Parada de lote de ruta',
  TimeSlot: 'Franja horaria',
  User: 'Usuario',
  UserAddress: 'Dirección',
  VehicleAssignment: 'Asignación de vehículo',
  AdminNotification: 'Notificación del panel',
  AdminNotificationRead: 'Lectura de notificación',
  CashBox: 'Caja',
  CashCategory: 'Categoría de caja',
  CashMovement: 'Movimiento de caja',
  CashSession: 'Sesión de caja',
  CommissionEntry: 'Comisión devengada',
  CommissionRule: 'Regla de comisión',
  CustomerAccount: 'Cuenta corriente',
  CustomerAccountAllocation: 'Imputación de cuenta corriente',
  CustomerAccountEntry: 'Movimiento de cuenta corriente',
  CustomerDistributor: 'Vínculo cliente-distribuidora',
  DriverLiquidation: 'Liquidación de chofer',
  DriverSettlement: 'Rendición de chofer',
  DriverSettlementCollection: 'Cobro de rendición',
  DriverSettlementExpense: 'Gasto de rendición',
  DriverSettlementOrder: 'Pedido de rendición',
  EmployeeAttendance: 'Asistencia de personal',
  EmployeeLeave: 'Licencia de personal',
  FuelLoad: 'Carga de combustible',
  InsuranceInstallment: 'Cuota de seguro',
  InsurancePolicy: 'Póliza de seguro',
  Insurer: 'Aseguradora',
  PaymentRefund: 'Devolución de pago',
  PurchaseOrder: 'Orden de compra',
  PurchaseOrderItem: 'Renglón de orden de compra',
  PurchaseReceipt: 'Recepción de compra',
  PurchaseReceiptItem: 'Renglón de recepción',
  StockAdjustment: 'Ajuste de stock',
  StockLocation: 'Ubicación de stock',
  StockThreshold: 'Umbral de stock',
  Supplier: 'Proveedor',
  Tire: 'Neumático',
  TireEvent: 'Evento de neumático',
  TrafficFine: 'Multa',
  TruckLoad: 'Carga de camión',
  TruckLoadItem: 'Renglón de carga de camión',
  VehicleAccident: 'Siniestro',
  Warehouse: 'Depósito',
} as const;

export type AuditEntityName = keyof typeof AUDIT_ENTITY;

export const AUDIT_ENTITY_OPTIONS = (Object.keys(AUDIT_ENTITY) as AuditEntityName[])
  .map((value) => ({ value, label: AUDIT_ENTITY[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

/** El nombre legible de una entidad; si el back suma una nueva, se ve su nombre técnico. */
export const auditEntityLabel = (entity: string): string =>
  entity in AUDIT_ENTITY ? AUDIT_ENTITY[entity as AuditEntityName] : entity;

const ACTION_TONE: Record<number, Label['tone']> = {
  1: 'success',
  2: 'info',
  3: 'danger',
  4: 'primary',
  5: 'danger',
  6: 'success',
  7: 'danger',
  8: 'neutral',
};

/** Etiqueta de una acción del catálogo de la API (el nombre viene de ahí). */
export const auditActionLabel = (action: { id: number; name: string }): Label => ({
  text: action.name,
  tone: ACTION_TONE[action.id] ?? 'neutral',
});

/** La auditoría de datos ya filtrada por una entidad y un registro (el «ver historial de cambios» de las fichas). */
export const auditHistoryPath = (entity: AuditEntityName, recordId: string): string =>
  `/audit?${new URLSearchParams({ entity, recordId }).toString()}`;

/** Id del tipo «Ingreso fallido» del catálogo. */
const FAILED_LOGIN = 7;

const ORIGIN_LABEL: Record<string, Label> = {
  user: { text: 'Usuario', tone: 'info' },
  system: { text: 'Sistema', tone: 'neutral' },
  direct: { text: 'Directo', tone: 'danger' },
};

/** Marca corta de quién originó el cambio: una persona, el sistema o SQL directo en la base. */
export const auditOriginLabel = (origin: string): Label => ORIGIN_LABEL[origin] ?? { text: origin, tone: 'neutral' };

/** Quién escribió el asiento: el trigger de la tabla o la aplicación (sesiones y lo anterior al 28/10). */
export const auditSourceLabel = (source: string): string =>
  source === 'db' ? 'Base de datos (trigger)' : source === 'app' ? 'Aplicación' : source;

interface AuthorEntry {
  entity: string;
  recordId: string;
  actionType: { id: number };
  origin: string;
  dbUser: string | null;
  user: { fullName?: string | null; email?: string | null; userId: string } | null;
}

/** Autor a mostrar: la persona; si no hay, el intento de ingreso fallido (email), el sistema o el rol de SQL directo. */
export const auditAuthorName = (entry: AuthorEntry): string => {
  if (entry.user) return entry.user.fullName ?? entry.user.email ?? entry.user.userId;
  if (entry.entity === 'Sesion' && entry.actionType.id === FAILED_LOGIN) return `Intento: ${entry.recordId}`;
  if (entry.origin === 'direct') return `SQL directo (${entry.dbUser ?? 'rol desconocido'})`;
  return 'Sistema';
};

const SESSION_FIELD_LABEL: Record<string, string> = {
  email: 'Email',
  canal: 'Canal',
  origen: 'App de origen',
  motivo: 'Motivo',
  cuenta: 'Cuenta',
};

/** Nombre legible de un campo de la entidad `Sesion`; el resto se muestra con su nombre técnico. */
export const auditSessionFieldLabel = (field: string): string => SESSION_FIELD_LABEL[field] ?? field;
