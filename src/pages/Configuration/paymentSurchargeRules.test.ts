import { describe, expect, it } from 'vitest';
import { paymentSurchargeSchema, toPaymentSurchargeBody, valuesOf } from './paymentSurchargeRules';

const base = { transfer: '10', mercadoPago: '10', cash: '0' };
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
    ['los límites', { transfer: '30', mercadoPago: '0', cash: '0.01' }],
    ['coma decimal', { transfer: '7,5', mercadoPago: '12,34', cash: '2' }],
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
    expect(paymentSurchargeSchema.safeParse({ ...base, transfer: raw }).success).toBe(false);
    expect(paymentSurchargeSchema.safeParse({ ...base, cash: raw }).success).toBe(false);
  });
});

describe('valuesOf / toPaymentSurchargeBody', () => {
  it('ida y vuelta, con coma o punto', () => {
    expect(valuesOf(config)).toEqual({ transfer: '7.5', mercadoPago: '12.34', cash: '0' });
    expect(toPaymentSurchargeBody({ transfer: '7,5', mercadoPago: '12.34', cash: '0' })).toEqual({
      transferPercentage: 7.5,
      mercadoPagoPercentage: 12.34,
      cashPercentage: 0,
    });
  });
});
