import { describe, expect, it } from 'vitest';
import type { Claim, FleetExpirations, Order } from '../../../services/api/types';
import { buildActivity } from './activity';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const iso = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

const order = {
  order_id: 'abcdef123456',
  status: 'delivered',
  total_amount: 1000,
  created_at: iso(5),
  accepted_at: iso(4),
  actual_delivery_date: iso(1),
  delivery_name: 'Ana',
  customer: { full_name: 'Cli' },
} as unknown as Order;

const claim = { claim_id: 'c1', order_id: 'abcdef123456', reason: 'Abollado', createdAt: iso(2) } as Claim;

const item = (status: 'expired' | 'due_soon', days: number) => ({
  taskId: `t${days}`,
  planId: 'p',
  planName: 'VTV',
  criticality: 'blocking' as const,
  dueAt: new Date(NOW + days * 86_400_000).toISOString(),
  expirationStatus: status,
  daysUntilDue: days,
});

const expirations = {
  withinDays: 15,
  drivers: [],
  vehicles: [
    {
      carId: 'car',
      carPatent: 'AA111BB',
      carBrand: null,
      carModel: null,
      isLocked: false,
      items: [
        item('due_soon', 3),
        item('expired', -2),
        { ...item('due_soon', 9), expirationStatus: 'current' as const },
      ],
    },
  ],
} as unknown as FleetExpirations;

describe('actividad reciente', () => {
  it('arma creado, aceptado y entregado de un pedido, y el reclamo, de más nuevo a más viejo', () => {
    const events = buildActivity({ orders: [order], claims: [claim], now: NOW });
    expect(events.map((e) => e.kind)).toEqual(['order_delivered', 'claim', 'order_accepted', 'order_created']);
    expect(events[0].to).toBe('/orders/abcdef123456');
    expect(events[0].title).toContain('#123456');
  });

  it('no cuenta como entregado un pedido que no lo está', () => {
    const pending = { ...order, status: 'pending', actual_delivery_date: iso(1) } as Order;
    expect(buildActivity({ orders: [pending], claims: [], now: NOW }).map((e) => e.kind)).not.toContain(
      'order_delivered',
    );
  });

  it('incluye los vencimientos más urgentes aunque haya muchos pedidos', () => {
    const orders = Array.from({ length: 10 }, (_, i) => ({ ...order, order_id: `id${i}`.padEnd(12, '0') }) as Order);
    const events = buildActivity({ orders, claims: [], expirations, now: NOW }, 4);
    const alerts = events.filter((e) => e.kind === 'expiration');
    expect(events).toHaveLength(4);
    expect(alerts.map((a) => a.detail).sort()).toEqual(['Por vencer', 'Vencido']);
    expect(alerts.find((a) => a.detail === 'Vencido')?.tone).toBe('danger');
  });

  it('ignora eventos con fecha inválida o en el futuro', () => {
    const future = { ...claim, createdAt: iso(-5) } as Claim;
    const bad = { ...claim, claim_id: 'c2', createdAt: 'nope' } as Claim;
    expect(buildActivity({ orders: [], claims: [future, bad], now: NOW })).toEqual([]);
  });
});
