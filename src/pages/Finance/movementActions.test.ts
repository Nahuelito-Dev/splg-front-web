import { describe, expect, it } from 'vitest';
import { reverseKindOf } from './movementActions';

const row = (referenceType: string, extra: object = {}) =>
  ({ referenceType, reversed: false, reversesMovementId: null, ...extra }) as Parameters<typeof reverseKindOf>[0];

describe('reverseKindOf', () => {
  it('un movimiento manual se anula suelto', () => {
    expect(reverseKindOf(row('manual'))).toBe('movement');
  });

  it('una pata de transferencia se anula como transferencia', () => {
    expect(reverseKindOf(row('box_transfer'))).toBe('transfer');
  });

  it.each(['driver_settlement', 'customer_payment', 'driver_liquidation', 'session_opening', 'session_closing'])(
    '%s no tiene "Anular" en el libro',
    (type) => {
      expect(reverseKindOf(row(type))).toBeNull();
    },
  );

  it('lo ya anulado y las anulaciones no se vuelven a anular', () => {
    expect(reverseKindOf(row('manual', { reversed: true }))).toBeNull();
    expect(reverseKindOf(row('reversal', { reversesMovementId: 'm-1' }))).toBeNull();
    expect(reverseKindOf(row('box_transfer', { reversed: true }))).toBeNull();
  });
});
