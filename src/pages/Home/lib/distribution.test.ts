import { describe, expect, it } from 'vitest';
import type { Order } from '../../../services/api/types';
import { NO_ZONE, ordersByZone, paymentLabel, paymentShares } from './distribution';

const order = (status: string, zone: string | null) =>
  ({ status, zone_surcharge: zone ? { name: zone } : null }) as unknown as Order;

describe('distribución', () => {
  it('cuenta pedidos por zona sin los cancelados y manda los sin zona a su grupo', () => {
    const zones = ordersByZone([
      order('delivered', 'Centro'),
      order('pending', 'Centro'),
      order('cancelled', 'Centro'),
      order('pending', null),
      order('pending', 'Villa'),
    ]);
    expect(zones).toEqual([
      { name: 'Centro', orders: 2 },
      { name: 'Villa', orders: 1 },
      { name: NO_ZONE, orders: 1 },
    ]);
  });

  it('ordena los métodos de pago por ventas y traduce el nombre', () => {
    const shares = paymentShares([
      { method: 'cash', totalOrders: 1, totalSales: 10 },
      { method: 'transfer', totalOrders: 2, totalSales: 30 },
    ]);
    expect(shares.map((s) => s.label)).toEqual(['Transferencia', 'Efectivo']);
    expect(paymentLabel('bitcoin')).toBe('bitcoin');
  });
});
