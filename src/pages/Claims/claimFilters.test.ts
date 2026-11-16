import { describe, expect, it } from 'vitest';
import type { Claim } from '../../services/api/types';
import { countClaimsByStatus, filterClaims } from './claimFilters';

const claim = (id: string, status: Claim['status'], name: string, reason = 'Roto'): Claim =>
  ({
    claim_id: id,
    order_id: `order-${id}`,
    status,
    reason,
    description: 'x',
    customer: { full_name: name, phone_number: '3764000000' },
  }) as unknown as Claim;

const CLAIMS = [
  claim('1', 'pending', 'Ana Pérez'),
  claim('2', 'resolved', 'Beto Gómez', 'Falta garrafa'),
  claim('3', 'pending', 'Carla Ruiz'),
];

describe('filterClaims', () => {
  it('filtra por estado y por término sin distinguir tildes ni mayúsculas', () => {
    expect(filterClaims(CLAIMS, { status: 'pending', term: '' }).map((c) => c.claim_id)).toEqual(['1', '3']);
    expect(filterClaims(CLAIMS, { status: 'all', term: 'perez' }).map((c) => c.claim_id)).toEqual(['1']);
    expect(filterClaims(CLAIMS, { status: 'all', term: 'FALTA' }).map((c) => c.claim_id)).toEqual(['2']);
  });

  it('combina estado y término, y busca por teléfono y por pedido', () => {
    expect(filterClaims(CLAIMS, { status: 'resolved', term: 'ana' })).toHaveLength(0);
    expect(filterClaims(CLAIMS, { status: 'all', term: '3764' })).toHaveLength(3);
    expect(filterClaims(CLAIMS, { status: 'all', term: 'order-2' }).map((c) => c.claim_id)).toEqual(['2']);
  });
});

describe('countClaimsByStatus', () => {
  it('cuenta por estado sobre la lista completa', () => {
    expect(countClaimsByStatus(CLAIMS)).toEqual({ pending: 2, in_process: 0, resolved: 1, rejected: 0, all: 3 });
  });
});
