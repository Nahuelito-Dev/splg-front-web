import { describe, expect, it } from 'vitest';
import { discountedPrice } from './pricing';

describe('discountedPrice', () => {
  it('aplica el porcentaje de descuento sobre el precio', () => {
    expect(discountedPrice(9000, 10)).toBe(8100);
  });

  it('sin descuento devuelve el precio de lista', () => {
    expect(discountedPrice(9000, 0)).toBe(9000);
  });

  it('con 100% de descuento el producto queda gratis', () => {
    expect(discountedPrice(9000, 100)).toBe(0);
  });
});
