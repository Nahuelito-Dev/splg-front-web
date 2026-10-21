import { describe, expect, it } from 'vitest';
import { newOrderSchema } from './newOrderSchema';

const base = {
  customerId: '8657d458-bb9e-4d4c-841d-6d936f7a4627',
  addressId: 'b4a7b2f0-1c2d-4e3f-9a0b-123456789abc',
  items: [{ gasCylinderId: 'c1', quantity: 2, unitPrice: 1500 }],
  paymentMethod: 'cash' as const,
  deliveryMode: 'standard' as const,
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

  describe('reserva programada con seña (CU-072)', () => {
    const reservation = { ...base, isReservation: true, scheduledDate: '2999-01-15', depositAmount: '500' };
    const messageAt = (input: unknown, field: string) =>
      newOrderSchema.safeParse(input).error?.issues.find((issue) => issue.path[0] === field)?.message;

    it('acepta una reserva completa', () => {
      expect(newOrderSchema.safeParse(reservation).success).toBe(true);
    });

    it('acepta la seña en 0 y con coma decimal', () => {
      expect(newOrderSchema.safeParse({ ...reservation, depositAmount: '0' }).success).toBe(true);
      expect(newOrderSchema.safeParse({ ...reservation, depositAmount: '500,50' }).success).toBe(true);
    });

    it('exige la fecha de entrega', () => {
      expect(messageAt({ ...reservation, scheduledDate: '' }, 'scheduledDate')).toBe(
        'Una reserva requiere fecha de entrega',
      );
    });

    it('rechaza una fecha pasada', () => {
      expect(messageAt({ ...reservation, scheduledDate: '2020-01-01' }, 'scheduledDate')).toBe(
        'No se puede agendar en una fecha pasada',
      );
    });

    it('exige el monto de la seña y no la admite negativa ni con letras', () => {
      expect(messageAt({ ...reservation, depositAmount: '' }, 'depositAmount')).toMatch(/Indicá el monto/);
      expect(messageAt({ ...reservation, depositAmount: 'abc' }, 'depositAmount')).toMatch(/Indicá el monto/);
      expect(messageAt({ ...reservation, depositAmount: '-5' }, 'depositAmount')).toBe('La seña no puede ser negativa');
    });

    it('no se paga con cuenta corriente ni se combina con el express', () => {
      expect(messageAt({ ...reservation, paymentMethod: 'account' }, 'paymentMethod')).toMatch(/cuenta corriente/);
      expect(messageAt({ ...reservation, deliveryMode: 'express' }, 'deliveryMode')).toMatch(/express/);
    });

    it('sin el indicador de reserva, la fecha y la seña no se validan', () => {
      expect(newOrderSchema.safeParse({ ...base, scheduledDate: '', depositAmount: 'abc' }).success).toBe(true);
    });
  });
});
