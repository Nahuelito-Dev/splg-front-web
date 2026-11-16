import { describe, expect, it } from 'vitest';
import type { Cylinder } from '../../services/api/types';
import { buildCylinderUpdate, cylinderEditDefaults, dayOf } from './cylinderEdit';

const CYLINDER = {
  serial: 'SN-1',
  gas_cylinder_id: 'g-1',
  deposit: 5000,
  manufactured_at: '2025-01-01T00:00:00.000Z',
} as unknown as Cylinder;

describe('dayOf / cylinderEditDefaults', () => {
  it('toma el día del ISO sin pasar por la zona horaria (medianoche UTC no retrocede un día)', () => {
    expect(dayOf('2025-01-01T00:00:00.000Z')).toBe('2025-01-01');
    expect(dayOf(null)).toBe('');
    expect(cylinderEditDefaults(CYLINDER).manufacturedAt).toBe('2025-01-01');
  });
});

describe('buildCylinderUpdate', () => {
  const same = cylinderEditDefaults(CYLINDER);

  it('sin cambios no manda nada (y no reenvía las fechas)', () => {
    expect(buildCylinderUpdate(CYLINDER, same)).toEqual({});
  });

  it('manda sólo lo modificado', () => {
    expect(buildCylinderUpdate(CYLINDER, { ...same, deposit: 6000, manufacturedAt: '2024-06-30' })).toEqual({
      deposit: 6000,
      manufacturedAt: '2024-06-30',
    });
  });

  it('vaciar una fecha o el producto viaja como null: no se pierde en silencio', () => {
    expect(buildCylinderUpdate(CYLINDER, { ...same, manufacturedAt: '', gasCylinderId: '' })).toEqual({
      manufacturedAt: null,
      gasCylinderId: null,
    });
  });
});
