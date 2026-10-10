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
  Employee: 'Legajo de personal',
  GasCylinder: 'Garrafa (producto)',
  GasCylinderPromotion: 'Promoción de garrafa',
  Incident: 'Incidencia',
  JobPosition: 'Puesto de trabajo',
  MaintenancePlan: 'Plan de flota',
  MaintenanceTask: 'Tarea de flota',
  MaintenanceTaskAttachment: 'Adjunto de tarea',
  MaintenanceWindowProposal: 'Propuesta de ventana de mantenimiento',
  ModuleConfig: 'Configuración de módulo',
  Order: 'Pedido',
  OrderAddressChange: 'Cambio de dirección del pedido',
  OrderItem: 'Renglón de pedido',
  Payment: 'Pago',
  Rating: 'Calificación',
  RepurchaseInvitation: 'Invitación de recompra',
  Role: 'Rol',
  RouteBatch: 'Lote de ruta',
  RouteBatchStop: 'Parada de lote de ruta',
  TimeSlot: 'Franja horaria',
  User: 'Usuario',
  UserAddress: 'Dirección',
  VehicleAssignment: 'Asignación de vehículo',
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
};

/** Etiqueta de una acción del catálogo de la API (el nombre viene de ahí). */
export const auditActionLabel = (action: { id: number; name: string }): Label => ({
  text: action.name,
  tone: ACTION_TONE[action.id] ?? 'neutral',
});

/** La auditoría de datos ya filtrada por una entidad y un registro (el «ver historial de cambios» de las fichas). */
export const auditHistoryPath = (entity: AuditEntityName, recordId: string): string =>
  `/audit?${new URLSearchParams({ entity, recordId }).toString()}`;
