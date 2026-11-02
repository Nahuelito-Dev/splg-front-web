import { describe, expect, it } from 'vitest';
import { findZoneConflict, nextZonePriority, zoneSchema } from './zoneSchema';

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

describe('unicidad entre zonas activas', () => {
  const zones = [
    { coverage_zone_id: 'z1', name: 'Centro', priority: 0, isActive: true },
    { coverage_zone_id: 'z2', name: 'Norte', priority: 1, isActive: true },
    { coverage_zone_id: 'z3', name: 'Vieja', priority: 5, isActive: false },
  ];

  it('detecta el nombre repetido sin distinguir mayúsculas', () => {
    expect(findZoneConflict({ name: ' centro ', priority: 9, isActive: true }, zones)?.field).toBe('name');
  });

  it('detecta la prioridad repetida', () => {
    expect(findZoneConflict({ name: 'Sur', priority: 1, isActive: true }, zones)?.field).toBe('priority');
  });

  it('las inactivas no cuentan, ni la zona que se edita contra sí misma', () => {
    expect(findZoneConflict({ name: 'Vieja', priority: 5, isActive: true }, zones)).toBeNull();
    expect(findZoneConflict({ name: 'Centro', priority: 0, isActive: true }, zones, 'z1')).toBeNull();
  });

  it('una zona inactiva puede repetir nombre y prioridad', () => {
    expect(findZoneConflict({ name: 'Centro', priority: 0, isActive: false }, zones)).toBeNull();
  });

  it('el alta propone la prioridad siguiente a las activas', () => {
    expect(nextZonePriority(zones)).toBe(2);
    expect(nextZonePriority([])).toBe(0);
  });
});

describe('vigencia', () => {
  it('validUntil no puede ser anterior a validFrom (el mismo día es una zona de un día, como EsPosteriorA)', () => {
    const base = {
      name: 'Z',
      label: '',
      surchargeType: 'fixed' as const,
      surchargeValue: 0,
      color: '#FF7A00',
      priority: 0,
      isActive: true,
    };
    expect(zoneSchema.safeParse({ ...base, validFrom: '2026-10-01', validUntil: '2026-10-01' }).success).toBe(true);
    expect(zoneSchema.safeParse({ ...base, validFrom: '2026-10-02', validUntil: '2026-10-01' }).success).toBe(false);
    expect(zoneSchema.safeParse({ ...base, validFrom: '2026-10-01', validUntil: '2026-10-02' }).success).toBe(true);
  });
});
