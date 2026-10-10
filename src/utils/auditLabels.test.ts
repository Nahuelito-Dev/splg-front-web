import { describe, expect, it } from 'vitest';
import { AUDIT_ENTITY, auditEntityLabel } from './auditLabels';

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
