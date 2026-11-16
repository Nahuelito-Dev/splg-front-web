import { describe, expect, it } from 'vitest';
import { gasCylinderSchema } from './gasCylinderSchema';

const base = { type: '10kg', weight: 10, price: 9000, stock: 5, description: '' };

describe('gasCylinderSchema', () => {
  it('acepta un producto sin promociones', () => {
    const result = gasCylinderSchema.safeParse({ ...base, promotions: [] });
    expect(result.success).toBe(true);
  });

  it('rechaza dos promociones con la misma cantidad', () => {
    const result = gasCylinderSchema.safeParse({
      ...base,
      promotions: [
        { quantity: 3, discountPercentage: 10 },
        { quantity: 3, discountPercentage: 20 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('acepta promociones con distinta cantidad', () => {
    const result = gasCylinderSchema.safeParse({
      ...base,
      promotions: [
        { quantity: 3, discountPercentage: 10 },
        { quantity: 5, discountPercentage: 20 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza una promoción de menos de 2 unidades', () => {
    const result = gasCylinderSchema.safeParse({ ...base, promotions: [{ quantity: 1, discountPercentage: 10 }] });
    expect(result.success).toBe(false);
  });

  it('rechaza un descuento mayor a 100', () => {
    const result = gasCylinderSchema.safeParse({ ...base, promotions: [{ quantity: 2, discountPercentage: 101 }] });
    expect(result.success).toBe(false);
  });

  it('rechaza un descuento de 0 o negativo', () => {
    const result = gasCylinderSchema.safeParse({ ...base, promotions: [{ quantity: 2, discountPercentage: 0 }] });
    expect(result.success).toBe(false);
  });

  it('rechaza precio o peso menor o igual a 0', () => {
    expect(gasCylinderSchema.safeParse({ ...base, price: 0, promotions: [] }).success).toBe(false);
    expect(gasCylinderSchema.safeParse({ ...base, weight: 0, promotions: [] }).success).toBe(false);
  });

  it('rechaza stock negativo', () => {
    expect(gasCylinderSchema.safeParse({ ...base, stock: -1, promotions: [] }).success).toBe(false);
  });

  it('la promoción llega a 99 % con 2 decimales, como el back', () => {
    const promo = (discountPercentage: number) => ({ ...base, promotions: [{ quantity: 2, discountPercentage }] });
    expect(gasCylinderSchema.safeParse(promo(99)).success).toBe(true);
    expect(gasCylinderSchema.safeParse(promo(99.5)).success).toBe(false);
    expect(gasCylinderSchema.safeParse(promo(100)).success).toBe(false);
    expect(gasCylinderSchema.safeParse(promo(10.123)).success).toBe(false);
    expect(gasCylinderSchema.safeParse(promo(10.25)).success).toBe(true);
  });

  it('el precio llega a 10.000.000 con 2 decimales', () => {
    expect(gasCylinderSchema.safeParse({ ...base, price: 10_000_000, promotions: [] }).success).toBe(true);
    expect(gasCylinderSchema.safeParse({ ...base, price: 10_000_001, promotions: [] }).success).toBe(false);
    expect(gasCylinderSchema.safeParse({ ...base, price: 100.125, promotions: [] }).success).toBe(false);
    expect(gasCylinderSchema.safeParse({ ...base, price: 100.5, promotions: [] }).success).toBe(true);
  });

  it('el peso llega a 1000 kg con 2 decimales', () => {
    expect(gasCylinderSchema.safeParse({ ...base, weight: 1000, promotions: [] }).success).toBe(true);
    expect(gasCylinderSchema.safeParse({ ...base, weight: 1000.01, promotions: [] }).success).toBe(false);
    expect(gasCylinderSchema.safeParse({ ...base, weight: 10.555, promotions: [] }).success).toBe(false);
  });
});
