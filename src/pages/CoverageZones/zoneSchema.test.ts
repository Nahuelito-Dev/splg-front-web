import { describe, expect, it } from 'vitest';
import { zoneSchema } from './zoneSchema';

const valid = {
  name: 'Villa Lanús',
  label: 'Zona centro',
  surchargeType: 'percentage' as const,
  surchargeValue: 10,
  color: '#FF7A00',
  priority: 0,
  validFrom: '',
  validUntil: '',
  isActive: true,
};

describe('zoneSchema', () => {
  it('acepta una zona válida', () => {
    expect(zoneSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza un porcentaje mayor a 100', () => {
    const result = zoneSchema.safeParse({ ...valid, surchargeValue: 150 });
    expect(result.success).toBe(false);
  });

  it('un recargo fijo sí puede superar 100', () => {
    expect(zoneSchema.safeParse({ ...valid, surchargeType: 'fixed', surchargeValue: 1800 }).success).toBe(true);
  });

  it('rechaza un color que no es hexadecimal', () => {
    expect(zoneSchema.safeParse({ ...valid, color: 'naranja' }).success).toBe(false);
  });

  it('rechaza una vigencia "hasta" anterior a "desde"', () => {
    const result = zoneSchema.safeParse({ ...valid, validFrom: '2026-12-01', validUntil: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('acepta una vigencia "hasta" posterior a "desde"', () => {
    expect(zoneSchema.safeParse({ ...valid, validFrom: '2026-01-01', validUntil: '2026-12-01' }).success).toBe(true);
  });

  it.each([
    ['sin nombre', { name: '' }],
    ['prioridad negativa', { priority: -1 }],
    ['prioridad decimal', { priority: 1.5 }],
    ['recargo negativo', { surchargeValue: -10 }],
    ['etiqueta demasiado larga', { label: 'x'.repeat(41) }],
  ])('rechaza %s', (_, cambio) => {
    expect(zoneSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
