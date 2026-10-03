import { describe, expect, it } from 'vitest';
import type { Customer } from '../../services/api/types';
import { countCustomersBySegment, filterCustomers } from './customerSegments';

const customer = (id: string, name: string, blocked: boolean): Customer =>
  ({
    customer_id: id,
    user: { full_name: name, email: `${id}@mail.com`, phone_number: `376400${id}`, blocked },
  }) as unknown as Customer;

const ALL = [customer('1', 'Ana Pérez', false), customer('2', 'Beto Gómez', true), customer('3', 'Carla Ruiz', false)];

describe('filterCustomers', () => {
  it('segmenta por cuenta activa o bloqueada', () => {
    expect(filterCustomers(ALL, { segment: 'active', term: '' }).map((c) => c.customer_id)).toEqual(['1', '3']);
    expect(filterCustomers(ALL, { segment: 'blocked', term: '' }).map((c) => c.customer_id)).toEqual(['2']);
    expect(filterCustomers(ALL, { segment: 'all', term: '' })).toHaveLength(3);
  });

  it('busca por nombre sin tildes, email o teléfono, combinado con el segmento', () => {
    expect(filterCustomers(ALL, { segment: 'all', term: 'perez' }).map((c) => c.customer_id)).toEqual(['1']);
    expect(filterCustomers(ALL, { segment: 'all', term: '3@mail' }).map((c) => c.customer_id)).toEqual(['3']);
    expect(filterCustomers(ALL, { segment: 'all', term: '3764002' }).map((c) => c.customer_id)).toEqual(['2']);
    expect(filterCustomers(ALL, { segment: 'blocked', term: 'ana' })).toHaveLength(0);
  });
});

describe('countCustomersBySegment', () => {
  it('cuenta todos, activos y bloqueados', () => {
    expect(countCustomersBySegment(ALL)).toEqual({ all: 3, active: 2, blocked: 1 });
  });
});
