import { describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { buildOrderHistory } from './orderHistory';

const baseOrder = (over: Partial<Order>): Order =>
  ({
    order_id: 'o-1',
    status: 'pending',
    created_at: '2026-10-01T13:00:00.000Z',
    accepted_at: null,
    on_the_way_at: null,
    actual_delivery_date: null,
    scheduledDate: null,
    depositAmount: 0,
    delivery_name: null,
    cancellation_reason: null,
    customer: { user_id: 'u', full_name: 'Ana Pérez', phone_number: null, email: null },
    ...over,
  }) as Order;

const states = (order: Order) => buildOrderHistory(order).map((item) => `${item.id}:${item.state}`);

describe('buildOrderHistory', () => {
  it('pendiente: creado es el hito actual y el resto del recorrido queda pendiente', () => {
    expect(states(baseOrder({}))).toEqual([
      'created:current',
      'accepted:pending',
      'on_the_way:pending',
      'delivered:pending',
    ]);
  });

  it('en camino: lo anterior queda hecho, con la hora y el chofer', () => {
    const items = buildOrderHistory(
      baseOrder({
        status: 'out_for_delivery',
        accepted_at: '2026-10-01T13:10:00.000Z',
        on_the_way_at: '2026-10-01T13:30:00.000Z',
        delivery_name: 'Luis Gómez',
      }),
    );
    expect(items.map((i) => `${i.id}:${i.state}`)).toEqual([
      'created:done',
      'accepted:done',
      'on_the_way:current',
      'delivered:pending',
    ]);
    expect(items[2].actor).toBe('Chofer: Luis Gómez');
    expect(items[3].when).toBeNull();
  });

  it('entregado: todo hecho y el último hito es el actual', () => {
    const order = baseOrder({
      status: 'delivered',
      accepted_at: '2026-10-01T13:10:00.000Z',
      on_the_way_at: '2026-10-01T13:30:00.000Z',
      actual_delivery_date: '2026-10-01T14:00:00.000Z',
    });
    expect(states(order)).toEqual(['created:done', 'accepted:done', 'on_the_way:done', 'delivered:current']);
  });

  it('reservado: aparece el hito de reserva con la fecha agendada', () => {
    const items = buildOrderHistory(
      baseOrder({ status: 'reserved', scheduledDate: '2026-10-10', depositAmount: 5000 }),
    );
    expect(items.map((i) => `${i.id}:${i.state}`).slice(0, 2)).toEqual(['created:done', 'reserved:current']);
    expect(String(items[1].note)).toContain('Reservado para');
  });

  it('la entrega solicitada del back (siempre nula) no se muestra: manda la fecha agendada', () => {
    const [created] = buildOrderHistory(baseOrder({ requested_delivery_date: '2026-10-02T15:00:00.000Z' }));
    expect(created.note).toBeUndefined();
  });

  it('cancelado: sólo los hitos alcanzados y el motivo', () => {
    const items = buildOrderHistory(
      baseOrder({ status: 'cancelled', accepted_at: '2026-10-01T13:10:00.000Z', cancellation_reason: 'Sin stock' }),
    );
    expect(items.map((i) => `${i.id}:${i.state}`)).toEqual(['created:done', 'accepted:done', 'cancelled:cancelled']);
    expect(items[2].note).toBe('Motivo: Sin stock');
  });

  it('el hito actual toma el tono del estado, igual que las etiquetas', () => {
    const delivered = buildOrderHistory(
      baseOrder({ status: 'delivered', actual_delivery_date: '2026-10-01T14:00:00.000Z' }),
    );
    expect(delivered.find((i) => i.state === 'current')?.tone).toBe('success');
    const cancelled = buildOrderHistory(baseOrder({ status: 'cancelled' }));
    expect(cancelled.find((i) => i.state === 'cancelled')?.tone).toBe('danger');
    expect(buildOrderHistory(baseOrder({ status: 'pending' }))[0].tone).toBe('warn');
  });
});
