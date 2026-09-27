import { describe, expect, it } from 'vitest';
import { stockLabel } from './stockLabel';

describe('stockLabel', () => {
  it('sin stock es peligro', () => {
    expect(stockLabel(0)).toEqual({ text: 'Sin stock', tone: 'danger' });
  });

  it('stock bajo (menos de 20) es advertencia', () => {
    expect(stockLabel(5)).toEqual({ text: '5 u.', tone: 'warn' });
  });

  it('stock cómodo es éxito', () => {
    expect(stockLabel(50)).toEqual({ text: '50 u.', tone: 'success' });
  });
});
