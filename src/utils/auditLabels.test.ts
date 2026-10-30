import { describe, expect, it } from 'vitest';
import {
  AUDIT_ENTITY,
  auditActionLabel,
  auditAuthorName,
  auditEntityLabel,
  auditSessionFieldLabel,
  auditSourceLabel,
} from './auditLabels';

describe('AUDIT_ENTITY', () => {
  it('cubre las entidades que el back audita y que antes faltaban', () => {
    for (const name of ['OrderItem', 'Payment', 'Employee', 'JobPosition', 'VehicleAssignment', 'RouteBatch']) {
      expect(AUDIT_ENTITY).toHaveProperty(name);
    }
  });

  it('una entidad que el panel no conoce se muestra con su nombre técnico', () => {
    expect(auditEntityLabel('AlgoNuevo')).toBe('AlgoNuevo');
    expect(auditEntityLabel('Order')).toBe('Pedido');
  });
});

describe('ingresos y origen', () => {
  it('la entidad Sesion se muestra como «Sesión»', () => {
    expect(auditEntityLabel('Sesion')).toBe('Sesión');
  });

  it('los tipos 6 a 8 tienen su tono', () => {
    expect(auditActionLabel({ id: 6, name: 'Ingreso' }).tone).toBe('success');
    expect(auditActionLabel({ id: 7, name: 'Ingreso fallido' }).tone).toBe('danger');
    expect(auditActionLabel({ id: 8, name: 'Salida' }).tone).toBe('neutral');
  });

  it('traduce los campos de sesión y quién escribió el asiento', () => {
    expect(auditSessionFieldLabel('motivo')).toBe('Motivo');
    expect(auditSessionFieldLabel('otro')).toBe('otro');
    expect(auditSourceLabel('db')).toBe('Base de datos (trigger)');
    expect(auditSourceLabel('app')).toBe('Aplicación');
  });

  const base = { entity: 'Order', recordId: 'r-1', actionType: { id: 2 }, origin: 'user', dbUser: null, user: null };

  it('autor nulo: «Sistema» o «SQL directo» según el origen', () => {
    expect(auditAuthorName({ ...base, origin: 'system' })).toBe('Sistema');
    expect(auditAuthorName({ ...base, origin: 'direct', dbUser: 'postgres' })).toBe('SQL directo (postgres)');
  });

  it('un ingreso fallido sin usuario muestra el email intentado', () => {
    expect(
      auditAuthorName({ ...base, entity: 'Sesion', recordId: 'a@b.com', actionType: { id: 7 }, origin: 'system' }),
    ).toBe('Intento: a@b.com');
  });

  it('con usuario muestra su nombre', () => {
    expect(auditAuthorName({ ...base, user: { userId: 'u-1', fullName: 'Ana', email: null } })).toBe('Ana');
  });
});

describe('entidades que audita la base', () => {
  const ALL = `AdminNotification AdminNotificationRead CashBox CashCategory CashMovement CashSession CommissionEntry
    CommissionRule CustomerAccount CustomerAccountAllocation CustomerAccountEntry CustomerDistributor DriverLiquidation
    DriverSettlement DriverSettlementCollection DriverSettlementExpense DriverSettlementOrder EmployeeAttendance
    EmployeeLeave FuelLoad InsuranceInstallment InsurancePolicy Insurer PaymentRefund PurchaseOrder PurchaseOrderItem
    PurchaseReceipt PurchaseReceiptItem StockAdjustment StockLocation StockThreshold Supplier Tire TireEvent TrafficFine
    TruckLoad TruckLoadItem VehicleAccident Warehouse`.split(/\s+/);

  it.each(ALL)('%s tiene nombre legible', (name) => {
    expect(AUDIT_ENTITY).toHaveProperty(name);
    expect(auditEntityLabel(name)).not.toBe(name);
  });

  it('el campo «origen» de una sesión es la app de origen', () => {
    expect(auditSessionFieldLabel('origen')).toBe('App de origen');
  });
});
