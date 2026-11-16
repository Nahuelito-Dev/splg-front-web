import { describe, expect, it } from 'vitest';
import type { Customer, Order } from '../../../services/api/types';
import type { NavViewer } from '../sidemenu/navScope';
import { buildSearchGroups, normalizeText, screenResults } from './searchItems';

const ADMIN: NavViewer = { mode: 'company', permissions: 'all' };
const PLATFORM: NavViewer = { mode: 'platform', permissions: 'all' };
const SUPPORT: NavViewer = { mode: 'support', permissions: 'all' };

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
    expect(screenResults('VEHICULOS', ADMIN).map((r) => r.to)).toContain('/cars');
  });

  it('sin término ofrece unas pocas pantallas', () => {
    expect(screenResults('', ADMIN)).toHaveLength(8);
  });

  it('las pantallas de plataforma sólo las ve el administrador general fuera del modo soporte', () => {
    expect(screenResults('distribuidoras', ADMIN)).toEqual([]);
    expect(screenResults('distribuidoras', SUPPORT)).toEqual([]);
    expect(screenResults('distribuidoras', PLATFORM).map((r) => r.to)).toEqual(['/distributors']);
  });

  it('en la plataforma no ofrece pantallas de empresa', () => {
    expect(screenResults('pedidos', PLATFORM)).toEqual([]);
    expect(screenResults('pedidos', SUPPORT).map((r) => r.to)).toContain('/orders');
  });

  it('también busca por el nombre de la sección', () => {
    expect(screenResults('garrafas y envases', ADMIN).map((r) => r.to)).toEqual([
      '/cylinders',
      '/physical-cylinders',
      '/physical-cylinders/recovery',
    ]);
  });
});

describe('buildSearchGroups', () => {
  it('agrupa por tipo en orden fijo, con la ficha de cada uno, y omite los grupos vacíos', () => {
    const groups = buildSearchGroups(screenResults('clientes', ADMIN), {
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
