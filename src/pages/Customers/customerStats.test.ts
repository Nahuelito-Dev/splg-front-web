import { describe, expect, it } from 'vitest';
import type { Order } from '../../services/api/types';
import { customerStats } from './customerStats';

const order = (status: Order['status'], total: number, createdAt: string): Order =>
  ({ order_id: createdAt, status, total_amount: total, created_at: createdAt }) as unknown as Order;

describe('customerStats', () => {
  it('suma sólo lo entregado, cuenta todos los pedidos y toma la fecha del último entregado (no de uno cancelado o en curso)', () => {
    const stats = customerStats(
      [
        order('delivered', 1000, '2026-09-01T10:00:00Z'),
        order('cancelled', 500, '2026-09-20T10:00:00Z'),
        order('delivered', 2500, '2026-08-01T10:00:00Z'),
        order('pending', 700, '2026-09-25T10:00:00Z'),
      ],
      4,
    );
    expect(stats).toEqual({
      totalPurchased: 3500,
      averageTicket: 1750,
      ordersCount: 4,
      lastPurchaseAt: '2026-09-01T10:00:00Z',
      partial: false,
    });
  });

  it('sin pedidos no inventa fecha ni monto', () => {
    expect(customerStats([], 0)).toEqual({
      totalPurchased: 0,
      averageTicket: null,
      ordersCount: 0,
      lastPurchaseAt: null,
      partial: false,
    });
  });

  it('avisa si el monto sale de una muestra (hay más pedidos que los traídos)', () => {
    expect(customerStats([order('delivered', 100, '2026-09-01T10:00:00Z')], 250).partial).toBe(true);
  });
});
