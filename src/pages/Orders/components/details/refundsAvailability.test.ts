import { describe, expect, it } from 'vitest';
import { STALE_PENDING_MS, canRetryRefunds, mayHaveRefunds } from './refundsAvailability';

const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const order = (over: Record<string, unknown> = {}) =>
  ({
    paymentMethodDetail: 'mercadopago',
    paymentStatus: 'paid',
    status: 'pending',
    expressSurchargeAmount: 0,
    expressDegradedAt: null,
    ...over,
  }) as never;
const refund = (over: Record<string, unknown> = {}) =>
  ({ kind: 'full', status: 'succeeded', updatedAt: new Date(NOW).toISOString(), ...over }) as never;

describe('mayHaveRefunds', () => {
  it('sólo MercadoPago o un pedido con recargo express', () => {
    expect(mayHaveRefunds(order())).toBe(true);
    expect(mayHaveRefunds(order({ paymentMethodDetail: 'cash', expressSurchargeAmount: 1500 }))).toBe(true);
    expect(mayHaveRefunds(order({ paymentMethodDetail: 'cash' }))).toBe(false);
  });
});

describe('canRetryRefunds', () => {
  it('una devolución fallida se reintenta', () => {
    expect(canRetryRefunds(order(), [refund({ status: 'failed' })], NOW)).toBe(true);
  });

  it('una pendiente reciente no; una pendiente vieja sí', () => {
    const reciente = refund({ status: 'pending', updatedAt: new Date(NOW - 60_000).toISOString() });
    const vieja = refund({ status: 'pending', updatedAt: new Date(NOW - STALE_PENDING_MS - 1000).toISOString() });
    expect(canRetryRefunds(order(), [reciente], NOW)).toBe(false);
    expect(canRetryRefunds(order(), [vieja], NOW)).toBe(true);
  });

  it('cancelado y cobrado por MercadoPago sin ninguna fila: se ofrece igual', () => {
    expect(canRetryRefunds(order({ status: 'cancelled' }), [], NOW)).toBe(true);
  });

  it('cancelado y ya reintegrado por completo: no', () => {
    expect(canRetryRefunds(order({ status: 'cancelled' }), [refund()], NOW)).toBe(false);
  });

  it('cancelado en efectivo o sin cobrar: no hay nada que devolver por la pasarela', () => {
    expect(canRetryRefunds(order({ status: 'cancelled', paymentMethodDetail: 'cash' }), [], NOW)).toBe(false);
    expect(canRetryRefunds(order({ status: 'cancelled', paymentStatus: 'pending' }), [], NOW)).toBe(false);
  });

  it('express que pasó al reparto común con el recargo cobrado y sin devolver: se ofrece sin filas', () => {
    const degradado = order({ expressSurchargeAmount: 1500, expressDegradedAt: '2026-10-17T11:00:00.000Z' });
    expect(canRetryRefunds(degradado, [], NOW)).toBe(true);
    expect(canRetryRefunds(degradado, [refund({ kind: 'express_surcharge' })], NOW)).toBe(false);
  });

  it('un express que no pasó al reparto común no ofrece nada', () => {
    expect(canRetryRefunds(order({ expressSurchargeAmount: 1500 }), [], NOW)).toBe(false);
  });
});
