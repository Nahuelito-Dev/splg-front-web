import { describe, expect, it } from 'vitest';
import type { Customer, Order } from '../../../services/api/types';
import { buildSearchGroups, normalizeText, screenResults } from './searchItems';

const customer = { customer_id: 'c1', user: { full_name: 'Emilia Villalba', email: 'e@x.com' } } as unknown as Customer;
const order = {
  order_id: 'abcdef123456',
  status: 'pending',
  total_amount: 1500,
  customer: { full_name: 'Emilia Villalba' },
} as unknown as Order;

describe('normalizeText', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizeText('  Vehículos ')).toBe('vehiculos');
  });
});

describe('screenResults', () => {
  it('encuentra pantallas sin tildes ni mayúsculas', () => {
    expect(screenResults('VEHICULOS', false).map((r) => r.to)).toContain('/cars');
  });

  it('sin término ofrece unas pocas pantallas', () => {
    expect(screenResults('', false)).toHaveLength(8);
  });

  it('las pantallas de superAdminOnly sólo las ve el administrador general', () => {
    expect(screenResults('distribuidoras', false)).toEqual([]);
    expect(screenResults('distribuidoras', true).map((r) => r.to)).toEqual(['/distributors']);
  });

  it('también busca por el nombre de la sección', () => {
    expect(screenResults('garrafas y envases', false).map((r) => r.to)).toEqual([
      '/cylinders',
      '/physical-cylinders',
      '/physical-cylinders/recovery',
    ]);
  });
});

describe('buildSearchGroups', () => {
  it('agrupa por tipo en orden fijo, con la ficha de cada uno, y omite los grupos vacíos', () => {
    const groups = buildSearchGroups(screenResults('clientes', false), {
      orders: [order],
      customers: [customer],
      deliveries: [],
      cars: [],
    });
    expect(groups.map((g) => g.title)).toEqual(['Pedidos', 'Clientes', 'Pantallas']);
    expect(groups[0].results[0]).toMatchObject({ to: '/orders/abcdef123456', title: '#123456 · Emilia Villalba' });
    expect(groups[1].results[0]).toMatchObject({ to: '/customers/details/c1', subtitle: 'e@x.com' });
  });
});
