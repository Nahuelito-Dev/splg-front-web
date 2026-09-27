import { describe, expect, it } from 'vitest';
import { isKnownPaymentMethod } from './paymentMethod';

describe('isKnownPaymentMethod', () => {
  it.each(['cash', 'mercadopago', 'transfer'])('reconoce "%s" como un medio de pago válido', (value) => {
    expect(isKnownPaymentMethod(value)).toBe(true);
  });

  it('un valor que la API todavía no documentó no es un medio de pago conocido', () => {
    expect(isKnownPaymentMethod('crypto')).toBe(false);
  });
});
