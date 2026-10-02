import { describe, expect, it } from 'vitest';
import { newOrderSchema } from './newOrderSchema';

const base = {
  customerId: '8657d458-bb9e-4d4c-841d-6d936f7a4627',
  addressId: 'b4a7b2f0-1c2d-4e3f-9a0b-123456789abc',
  items: [{ gasCylinderId: 'c1', quantity: 2, unitPrice: 1500 }],
  paymentMethod: 'cash' as const,
  notes: '',
};

describe('newOrderSchema (CU-072, alta telefónica)', () => {
  it('acepta un pedido completo', () => {
    expect(newOrderSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza sin cliente', () => {
    expect(newOrderSchema.safeParse({ ...base, customerId: '' }).success).toBe(false);
  });

  it('rechaza sin dirección', () => {
    expect(newOrderSchema.safeParse({ ...base, addressId: '' }).success).toBe(false);
  });

  it('rechaza sin ítems', () => {
    expect(newOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it('rechaza una cantidad menor a 1', () => {
    const result = newOrderSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 0 }] });
    expect(result.success).toBe(false);
  });

  it('rechaza un método de pago fuera del enum', () => {
    expect(newOrderSchema.safeParse({ ...base, paymentMethod: 'bitcoin' }).success).toBe(false);
  });

  it('las notas vacías no rompen', () => {
    const result = newOrderSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeUndefined();
  });
});
