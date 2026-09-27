import { describe, expect, it } from 'vitest';
import { onlinePaymentSurcharge } from './orderPricing';

describe('onlinePaymentSurcharge', () => {
  it('sin recargo de zona, es la diferencia entre el total y el subtotal', () => {
    expect(onlinePaymentSurcharge({ total_amount: 22000, subtotal_items: 20000, zone_surcharge: null })).toBe(2000);
  });

  it('con recargo de zona, se descuenta también', () => {
    expect(
      onlinePaymentSurcharge({
        total_amount: 24200,
        subtotal_items: 20000,
        zone_surcharge: { coverage_zone_id: 'x', name: 'Zona', type: 'percentage', value: 10, amount: 2000 },
      }),
    ).toBe(2200);
  });

  it('pago en efectivo: sin recargo, da 0', () => {
    expect(onlinePaymentSurcharge({ total_amount: 20000, subtotal_items: 20000, zone_surcharge: null })).toBe(0);
  });
});
