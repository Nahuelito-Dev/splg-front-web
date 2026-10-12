import { describe, expect, it } from 'vitest';
import { orderCreateBody, orderSchema, orderUpdateBody } from './orderSchema';
import { receiptSchema } from './receiptSchema';
import { supplierSchema } from './supplierSchema';

const supplier = {
  businessName: 'Gas SA',
  cuit: '30-71512345-9',
  kind: 'other',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  paymentTermsDays: '',
};

describe('supplierSchema', () => {
  it('acepta un CUIT con guiones', () => expect(supplierSchema.safeParse(supplier).success).toBe(true));
  it('rechaza un CUIT con dígito verificador incorrecto', () =>
    expect(supplierSchema.safeParse({ ...supplier, cuit: '30715123456' }).success).toBe(false));
  it('el plazo va de 0 a 365', () => {
    expect(supplierSchema.safeParse({ ...supplier, paymentTermsDays: '366' }).success).toBe(false);
    expect(supplierSchema.safeParse({ ...supplier, paymentTermsDays: '0' }).success).toBe(true);
  });
});

describe('orderSchema', () => {
  const base = {
    supplierId: 's',
    destinationWarehouseId: '',
    expectedDate: '',
    notes: '',
    items: [{ gasCylinderId: 'g', quantity: 5, unitCost: 100, emptiesToExchange: 0 }],
  };
  it('acepta una orden', () => expect(orderSchema.safeParse(base).success).toBe(true));
  it('respeta los topes del back', () => {
    expect(orderSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 5001 }] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, items: [{ ...base.items[0], unitCost: 90001 }] }).success).toBe(false);
    expect(orderSchema.safeParse({ ...base, items: Array(21).fill(base.items[0]) }).success).toBe(false);
  });
});

describe('receiptSchema', () => {
  const row = { gasCylinderId: 'g', type: '10kg', quantityFull: 5, quantityEmptyOut: 0, unitCost: 100 };
  const base = {
    mode: 'direct',
    supplierId: 's',
    warehouseId: '',
    supplierDocumentType: 'delivery_note',
    supplierDocumentNumber: 'R-1',
    receivedAt: '',
    notes: '',
    items: [row],
  };
  it('acepta una compra directa', () => expect(receiptSchema.safeParse(base).success).toBe(true));
  it('sin orden hace falta el proveedor', () =>
    expect(receiptSchema.safeParse({ ...base, supplierId: '' }).success).toBe(false));
  it('contra una orden no se recibe más de lo pendiente', () =>
    expect(receiptSchema.safeParse({ ...base, mode: 'order', items: [{ ...row, pending: 4 }] }).success).toBe(false));
  it('exige algo recibido o alguna vacía', () =>
    expect(receiptSchema.safeParse({ ...base, items: [{ ...row, quantityFull: 0 }] }).success).toBe(false));
  it('sólo vacías es válido', () =>
    expect(
      receiptSchema.safeParse({ ...base, items: [{ ...row, quantityFull: 0, quantityEmptyOut: 3 }] }).success,
    ).toBe(true));
});

describe('cuerpo de la orden', () => {
  const values = {
    supplierId: 's1',
    destinationWarehouseId: '',
    expectedDate: '',
    notes: '',
    items: [{ gasCylinderId: 'g', quantity: 1, unitCost: 1, emptiesToExchange: 0 }],
  };
  it('al editar no manda el proveedor si no cambió', () =>
    expect(orderUpdateBody(values, { supplierId: 's1' })).not.toHaveProperty('supplierId'));
  it('al editar lo manda si cambió', () =>
    expect(orderUpdateBody(values, { supplierId: 's0' })).toHaveProperty('supplierId', 's1'));
  it('al crear siempre lo manda', () => expect(orderCreateBody(values)).toHaveProperty('supplierId', 's1'));
});
