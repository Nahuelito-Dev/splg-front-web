import { describe, expect, it } from 'vitest';
import { paymentSurchargeSchema, toPaymentSurchargeBody, valuesOf } from './paymentSurchargeRules';

const base = { mercadoPago: '10', cash: '0' };
const config = {
  transferPercentage: 7.5,
  mercadoPagoPercentage: 12.34,
  cashPercentage: 0,
  isDefault: false,
  updatedAt: null,
  updatedByUserId: null,
};

describe('paymentSurchargeSchema', () => {
  it.each([
    ['los valores por defecto', base],
    ['los límites', { mercadoPago: '30', cash: '0.01' }],
    ['coma decimal', { mercadoPago: '12,34', cash: '2' }],
  ])('acepta %s', (_n, values) => {
    expect(paymentSurchargeSchema.safeParse(values).success).toBe(true);
  });

  it.each([
    ['vacío', ''],
    ['texto', 'abc'],
    ['negativo', '-1'],
    ['más de 30', '30.01'],
    ['tres decimales', '10.123'],
    ['dos comas', '1,2,3'],
  ])('rechaza %s', (_n, raw) => {
    expect(paymentSurchargeSchema.safeParse({ ...base, mercadoPago: raw }).success).toBe(false);
    expect(paymentSurchargeSchema.safeParse({ ...base, cash: raw }).success).toBe(false);
  });
});

describe('valuesOf / toPaymentSurchargeBody', () => {
  it('ida y vuelta, con coma o punto, sin el recargo de transferencia (que ya no se acepta)', () => {
    expect(valuesOf(config)).toEqual({ mercadoPago: '12.34', cash: '0' });
    expect(toPaymentSurchargeBody({ mercadoPago: '12.34', cash: '0' })).toEqual({
      mercadoPagoPercentage: 12.34,
      cashPercentage: 0,
    });
    expect(toPaymentSurchargeBody({ mercadoPago: '12.34', cash: '0' })).not.toHaveProperty('transferPercentage');
  });
});
