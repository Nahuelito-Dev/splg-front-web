import { describe, expect, it } from 'vitest';
import type { Cylinder } from '../../services/api/types';
import { filterCylinders, movable, uuidOrUndefined } from './cylinderFilters';

const cylinder = (id: string, state: Cylinder['state'], serial: string, customer?: string): Cylinder =>
  ({
    cylinder_id: id,
    state,
    serial,
    gas_cylinder: { type: 'Garrafa 10 kg' },
    current_customer: customer ? { full_name: customer } : null,
  }) as unknown as Cylinder;

const ALL = [
  cylinder('1', 'in_depot', 'GAS-001'),
  cylinder('2', 'filled', 'GAS-002'),
  cylinder('3', 'with_customer', 'GAS-003', 'Ana Pérez'),
  cylinder('4', 'empty_returned', 'GAS-004'),
];

describe('filterCylinders', () => {
  it('filtra por estado y por serial, producto o cliente sin tildes', () => {
    expect(filterCylinders(ALL, { state: 'filled', term: '' }).map((c) => c.cylinder_id)).toEqual(['2']);
    expect(filterCylinders(ALL, { state: 'all', term: 'gas-003' }).map((c) => c.cylinder_id)).toEqual(['3']);
    expect(filterCylinders(ALL, { state: 'all', term: 'perez' }).map((c) => c.cylinder_id)).toEqual(['3']);
    expect(filterCylinders(ALL, { state: 'all', term: '10 kg' })).toHaveLength(4);
    expect(filterCylinders(ALL, { state: 'in_depot', term: 'perez' })).toHaveLength(0);
  });
});

describe('movable', () => {
  it('sólo deja los que pueden pasar al estado pedido según la máquina de estados', () => {
    expect(movable(ALL, 'filled').map((c) => c.cylinder_id)).toEqual(['1']);
    expect(movable(ALL, 'in_depot').map((c) => c.cylinder_id)).toEqual(['2', '4']);
  });

  it('un envase retirado (terminal) no se mueve a ningún estado y no rompe la selección en lote', () => {
    const withRetired = [...ALL, cylinder('5', 'retired', 'GAS-005')];
    expect(() => movable(withRetired, 'filled')).not.toThrow();
    expect(movable(withRetired, 'filled').map((c) => c.cylinder_id)).toEqual(['1']);
    expect(movable(withRetired, 'in_depot').map((c) => c.cylinder_id)).toEqual(['2', '4']);
  });
});

describe('uuidOrUndefined', () => {
  it('deja pasar un UUID y descarta cualquier otra cosa', () => {
    expect(uuidOrUndefined('5baddc17-24e6-4a69-9e11-45f321956d60')).toBe('5baddc17-24e6-4a69-9e11-45f321956d60');
    expect(uuidOrUndefined('abc')).toBeUndefined();
    expect(uuidOrUndefined('')).toBeUndefined();
  });
});
