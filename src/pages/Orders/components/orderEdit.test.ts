import { describe, expect, it } from 'vitest';
import {
  buildOrderUpdate,
  orderEditBlockedReason,
  orderEditSchema,
  type OrderEditInitial,
  type OrderEditValues,
} from './orderEdit';

const initial: OrderEditInitial = {
  addressId: 'a-1',
  scheduledDate: '2026-10-15',
  notes: 'Timbre 2B',
  items: [{ gasCylinderId: 'g-1', quantity: 2 }],
};
const same: OrderEditValues = {
  addressId: 'a-1',
  timeSlotId: '',
  scheduledDate: '2026-10-15',
  paymentMethod: '',
  notes: 'Timbre 2B',
  items: [{ gasCylinderId: 'g-1', quantity: 2 }],
};

describe('orderEditBlockedReason', () => {
  const base = { status: 'pending', delivery_id: null, payment_url: undefined } as const;
  it('un pedido pendiente y sin chofer se puede intentar editar', () => {
    expect(orderEditBlockedReason(base)).toBeNull();
  });
  it('«online» sin checkout no bloquea: puede ser una transferencia y el back decide con su 409', () => {
    expect(orderEditBlockedReason({ ...base })).toBeNull();
    expect(orderEditBlockedReason({ ...base, payment_url: '' })).toBeNull();
  });
  it('explica por qué no: estado, chofer o checkout de MercadoPago', () => {
    expect(orderEditBlockedReason({ ...base, status: 'accepted' })).toMatch(/pendiente/);
    expect(orderEditBlockedReason({ ...base, delivery_id: 'd-1' })).toMatch(/chofer/);
    expect(orderEditBlockedReason({ ...base, payment_url: 'https://mp/x' })).toMatch(/MercadoPago/);
  });
});

describe('buildOrderUpdate', () => {
  it('sin cambios no manda nada', () => {
    expect(buildOrderUpdate(initial, same)).toEqual({});
  });

  it('manda sólo lo que cambió', () => {
    expect(buildOrderUpdate(initial, { ...same, addressId: 'a-2', notes: ' Portón negro ' })).toEqual({
      addressId: 'a-2',
      notes: 'Portón negro',
    });
  });

  it('los renglones se mandan completos sólo si cambiaron, sin importar el orden', () => {
    const two = [
      { gasCylinderId: 'g-1', quantity: 2 },
      { gasCylinderId: 'g-2', quantity: 1 },
    ];
    expect(buildOrderUpdate({ ...initial, items: two }, { ...same, items: [...two].reverse() })).toEqual({});
    expect(buildOrderUpdate(initial, { ...same, items: two })).toEqual({ items: two });
    expect(buildOrderUpdate(initial, { ...same, items: [{ gasCylinderId: 'g-1', quantity: 3 }] }).items).toEqual([
      { gasCylinderId: 'g-1', quantity: 3 },
    ]);
  });

  it('la franja nueva viaja con la fecha agendada; "sin franja" manda null', () => {
    expect(buildOrderUpdate(initial, { ...same, timeSlotId: 's-1' })).toEqual({
      timeSlotId: 's-1',
      scheduledDate: '2026-10-15',
    });
    expect(buildOrderUpdate(initial, { ...same, timeSlotId: 'none' })).toEqual({ timeSlotId: null });
  });

  it('el medio de pago sólo si se eligió uno', () => {
    expect(buildOrderUpdate(initial, { ...same, paymentMethod: 'transfer' })).toEqual({ paymentMethod: 'transfer' });
  });
});

describe('orderEditSchema', () => {
  const values = {
    addressId: 'a-1',
    timeSlotId: '',
    scheduledDate: '',
    paymentMethod: '' as const,
    notes: '',
    items: [{ gasCylinderId: 'g-1', quantity: 2 }],
  };
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  it('acepta una edición válida', () => {
    expect(orderEditSchema('').safeParse(values).success).toBe(true);
  });

  it('exige al menos un renglón', () => {
    expect(orderEditSchema('').safeParse({ ...values, items: [] }).success).toBe(false);
  });

  it('la cantidad es entera, desde 1 y sin tope', () => {
    const quantity = (q: number) =>
      orderEditSchema('').safeParse({ ...values, items: [{ gasCylinderId: 'g-1', quantity: q }] });
    expect(quantity(0).success).toBe(false);
    expect(quantity(1.5).success).toBe(false);
    expect(quantity(1000).success).toBe(true);
    expect(quantity(Number.NaN).success).toBe(false);
  });

  it('no repite la misma garrafa', () => {
    const items = [
      { gasCylinderId: 'g-1', quantity: 1 },
      { gasCylinderId: 'g-1', quantity: 2 },
    ];
    expect(orderEditSchema('').safeParse({ ...values, items }).success).toBe(false);
  });

  it('una fecha agendada nueva no puede ser pasada', () => {
    expect(orderEditSchema('').safeParse({ ...values, scheduledDate: '2020-01-01' }).success).toBe(false);
    expect(orderEditSchema('').safeParse({ ...values, scheduledDate: tomorrow }).success).toBe(true);
  });

  it('la fecha que el pedido ya tenía no se toca aunque haya vencido', () => {
    expect(orderEditSchema('2020-01-01').safeParse({ ...values, scheduledDate: '2020-01-01' }).success).toBe(true);
  });

  it('las notas no tienen máximo: no se bloquea editar un pedido con notas largas', () => {
    expect(orderEditSchema('').safeParse({ ...values, notes: 'a'.repeat(900) }).success).toBe(true);
  });

  it('cambiar la franja de un pedido con la fecha vencida exige una fecha nueva', () => {
    const old = orderEditSchema('2020-01-01');
    const withSlot = { ...values, scheduledDate: '2020-01-01', timeSlotId: 'slot-1' };
    expect(old.safeParse(withSlot).success).toBe(false);
    expect(old.safeParse({ ...withSlot, scheduledDate: tomorrow }).success).toBe(true);
    // Sin tocar la agenda, la fecha original se conserva.
    expect(old.safeParse({ ...values, scheduledDate: '2020-01-01' }).success).toBe(true);
    // Sacar la franja no valida la fecha.
    expect(old.safeParse({ ...values, scheduledDate: '2020-01-01', timeSlotId: 'none' }).success).toBe(true);
  });
});
