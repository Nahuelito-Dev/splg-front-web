import { describe, expect, it } from 'vitest';
import { negativeStockMessage } from './stockAdjust';

describe('ajuste de stock del catálogo', () => {
  it('no deja el stock en negativo', () => {
    expect(negativeStockMessage(5, -6)).toMatch(/Solo hay 5 unidades/);
    expect(negativeStockMessage(5, -5)).toBeUndefined();
    expect(negativeStockMessage(0, 10)).toBeUndefined();
  });
});
