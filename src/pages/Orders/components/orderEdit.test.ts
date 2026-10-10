import { describe, expect, it } from 'vitest';
import { buildOrderUpdate, orderEditBlockedReason, type OrderEditInitial, type OrderEditValues } from './orderEdit';

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
