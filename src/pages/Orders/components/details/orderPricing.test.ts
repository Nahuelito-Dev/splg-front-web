import { describe, expect, it } from 'vitest';
import {
  orderSurchargeLabel,
  paymentSurchargeAmount,
  paymentSurchargeLabel,
  quoteSurchargeLabel,
} from './orderPricing';

describe('paymentSurchargeAmount', () => {
  it('es el que guardó el back, sin deducirlo del total', () => {
    expect(paymentSurchargeAmount({ paymentSurchargeAmount: 1350 })).toBe(1350);
    expect(paymentSurchargeAmount({ paymentSurchargeAmount: 0 })).toBe(0);
  });
});

describe('paymentSurchargeLabel', () => {
  it.each([
    ['transfer', 10, 'Recargo por transferencia (10 %)'],
    ['mercadopago', 7.5, 'Recargo por Mercado Pago (7,5 %)'],
    ['cash', 2, 'Recargo por efectivo (2 %)'],
    ['transfer', 12.34, 'Recargo por transferencia (12,34 %)'],
    ['transfer', 0, 'Recargo por transferencia (0 %)'],
  ])('%s al %s %%', (method, percentage, expected) => {
    expect(paymentSurchargeLabel(method, percentage)).toBe(expected);
  });

  it('un pedido anterior (sin porcentaje) va sin él, y un medio desconocido no se inventa', () => {
    expect(paymentSurchargeLabel('transfer', null)).toBe('Recargo por transferencia');
    expect(paymentSurchargeLabel('account', 5)).toBe('Recargo por medio de pago (5 %)');
    expect(paymentSurchargeLabel(undefined, undefined)).toBe('Recargo por medio de pago');
  });

  it('del pedido y de la cotización', () => {
    expect(orderSurchargeLabel({ paymentMethodDetail: 'mercadopago', paymentSurchargePercentage: 10 })).toBe(
      'Recargo por Mercado Pago (10 %)',
    );
    expect(quoteSurchargeLabel({ paymentMethod: 'transfer', paymentSurchargePercentage: 7.5 })).toBe(
      'Recargo por transferencia (7,5 %)',
    );
  });
});
