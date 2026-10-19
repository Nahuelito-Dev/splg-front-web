import { describe, expect, it } from 'vitest';
import type { Order } from '../../services/api/types';
import { deliveredToday, matchesBoardSearch, sortColumn, stageStartedAt } from './boardRules';

const order = (fields: Partial<Order> & { order_id: string }): Order =>
  ({ status: 'pending', created_at: '2026-10-18T12:00:00Z', ...fields }) as unknown as Order;

describe('boardRules', () => {
  it('el reloj de cada etapa corre desde su propio momento y cae al anterior si falta', () => {
    expect(stageStartedAt(order({ order_id: 'a', status: 'pending' }))).toBe('2026-10-18T12:00:00Z');
    expect(stageStartedAt(order({ order_id: 'a', status: 'accepted', accepted_at: '2026-10-18T12:05:00Z' }))).toBe(
      '2026-10-18T12:05:00Z',
    );
    expect(
      stageStartedAt(order({ order_id: 'a', status: 'out_for_delivery', accepted_at: '2026-10-18T12:05:00Z' })),
    ).toBe('2026-10-18T12:05:00Z');
    expect(stageStartedAt(order({ order_id: 'a', status: 'delivered' }))).toBe('2026-10-18T12:00:00Z');
  });

  it('«Entregados hoy» deja sólo los de hoy en Buenos Aires, aunque en UTC ya sea otro día', () => {
    const now = new Date('2026-10-18T15:00:00Z');
    const orders = [
      order({ order_id: 'hoy', status: 'delivered', actual_delivery_date: '2026-10-18T14:00:00Z' }),
      // 02:00 UTC del 18 = 23:00 del 17 en Buenos Aires: es de ayer.
      order({ order_id: 'ayer', status: 'delivered', actual_delivery_date: '2026-10-18T02:00:00Z' }),
      // 02:30 UTC del 19 = 23:30 del 18 en Buenos Aires: es de hoy.
      order({ order_id: 'tarde', status: 'delivered', actual_delivery_date: '2026-10-19T02:30:00Z' }),
      order({ order_id: 'sin-fecha', status: 'delivered', actual_delivery_date: null }),
    ];
    expect(deliveredToday(orders, now).map((o) => o.order_id)).toEqual(['hoy', 'tarde']);
  });

  it('las columnas de espera ponen arriba al que más lleva; las entregas, al último entregado', () => {
    const orders = [
      order({ order_id: 'nuevo', created_at: '2026-10-18T12:30:00Z' }),
      order({ order_id: 'viejo', created_at: '2026-10-18T11:00:00Z' }),
    ];
    expect(sortColumn('pending', orders).map((o) => o.order_id)).toEqual(['viejo', 'nuevo']);
    const delivered = [
      order({ order_id: 'a', status: 'delivered', actual_delivery_date: '2026-10-18T10:00:00Z' }),
      order({ order_id: 'b', status: 'delivered', actual_delivery_date: '2026-10-18T13:00:00Z' }),
    ];
    expect(sortColumn('delivered', delivered).map((o) => o.order_id)).toEqual(['b', 'a']);
  });

  it('no reordena el arreglo que recibe', () => {
    const orders = [order({ order_id: 'b', created_at: '2026-10-18T13:00:00Z' }), order({ order_id: 'a' })];
    sortColumn('pending', orders);
    expect(orders.map((o) => o.order_id)).toEqual(['b', 'a']);
  });

  it('la búsqueda mira cliente, chofer, calle e id corto, sin importar mayúsculas', () => {
    const o = order({
      order_id: 'xxxxxx-ABC123',
      customer: { full_name: 'Ana Pérez' } as Order['customer'],
      delivery_name: 'Beto Gómez',
      delivery_address: { street: 'Av. Mitre 123' } as Order['delivery_address'],
    });
    for (const term of ['ana', 'BETO', 'mitre', 'abc123', '  ']) expect(matchesBoardSearch(o, term)).toBe(true);
    expect(matchesBoardSearch(o, 'carla')).toBe(false);
  });
});
