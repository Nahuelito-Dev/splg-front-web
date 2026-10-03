import { describe, expect, it } from 'vitest';
import { variationPill } from './variation';

describe('variationPill', () => {
  it('sube y baja contra el período anterior', () => {
    expect(variationPill(150, 100)).toEqual({ text: '+50%', trend: 'up' });
    expect(variationPill(75, 100)).toEqual({ text: '-25%', trend: 'down' });
  });

  it('igual al anterior no marca tendencia', () => {
    expect(variationPill(100, 100).trend).toBe('neutral');
  });

  it('si el período anterior estuvo en cero no inventa un porcentaje: es «Nuevo»', () => {
    expect(variationPill(10, 0)).toEqual({ text: 'Nuevo', trend: 'up' });
    expect(variationPill(0, 0)).toEqual({ text: 'Sin cambios', trend: 'neutral' });
  });
});
