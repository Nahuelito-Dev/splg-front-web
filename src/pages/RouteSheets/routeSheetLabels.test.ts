import { describe, expect, it } from 'vitest';
import { sheet, uuid } from '../../test/routeSheetFixtures';
import { buildStopTargetSchema, sheetFormSchema } from './routeSheetSchemas';
import {
  formatMinutes,
  hhmm,
  loadPercent,
  loadText,
  move,
  onlyLateStops,
  returnAtOf,
  startAtOf,
  tomorrow,
} from './routeSheetLabels';

describe('routeSheetLabels', () => {
  it('mañana se cuenta en Buenos Aires: a las 23:30 del 13 (02:30 UTC del 14) sigue siendo el 14', () => {
    expect(tomorrow(new Date('2026-11-14T02:30:00.000Z'))).toBe('2026-11-14');
    expect(tomorrow(new Date('2026-12-31T15:00:00.000Z'))).toBe('2027-01-01');
  });

  it('la salida del formulario es hora argentina del día del plan', () => {
    expect(startAtOf('2026-11-14', '07:45')).toBe('2026-11-14T10:45:00.000Z');
    expect(hhmm('2026-11-14T10:45:00.000Z')).toBe('07:45');
    expect(hhmm(null)).toBe('—');
  });

  it('el regreso es la salida más la duración', () => {
    expect(hhmm(returnAtOf(sheet({ plannedStartAt: '2026-11-14T10:30:00.000Z' })))).toBe('09:05');
    expect(returnAtOf(sheet({ plannedStartAt: null }))).toBeNull();
  });

  it('la carga se mide en unidades si el vehículo las tiene; si no, en kilos', () => {
    expect(loadPercent(sheet({ capacity: { kg: null, units: 6 } }))).toBe(50);
    expect(loadText(sheet({ capacity: { kg: 60, units: null } }))).toBe('30 / 60 kg');
    expect(loadPercent(sheet({ capacity: { kg: null, units: null } }))).toBeNull();
  });

  it('formatMinutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });

  it('move no cambia la lista con índices fuera de rango', () => {
    const list = [1, 2, 3];
    expect(move(list, 0, 3)).toBe(list);
    expect(move(list, 2, 0)).toEqual([3, 1, 2]);
  });

  it('acceptLateStops sólo saltea las paradas tarde', () => {
    expect(onlyLateStops([{ code: 'late_stops', message: '' }])).toBe(true);
    expect(
      onlyLateStops([
        { code: 'late_stops', message: '' },
        { code: 'stops_not_plannable', message: '' },
      ]),
    ).toBe(false);
    expect(onlyLateStops([])).toBe(false);
  });
});

describe('esquemas de los formularios', () => {
  const sheets = [sheet({ id: uuid(1) })];
  const schema = buildStopTargetSchema(sheets);

  it('la posición va de 1 a paradas + 1 (vacío: donde convenga)', () => {
    const base = { targetSheetId: uuid(1), acceptLateStops: false };
    expect(schema.safeParse({ ...base, position: '' }).success).toBe(true);
    expect(schema.safeParse({ ...base, position: '4' }).success).toBe(true);
    expect(schema.safeParse({ ...base, position: '5' }).success).toBe(false);
    expect(schema.safeParse({ ...base, position: '0' }).success).toBe(false);
    expect(schema.safeParse({ ...base, position: '1.5' }).success).toBe(false);
    expect(schema.safeParse({ ...base, targetSheetId: '', position: '' }).success).toBe(false);
  });

  it('la hoja: ids de la lista y hora HH:MM', () => {
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: uuid(20), originWarehouseId: '', startTime: '07:30' }).success,
    ).toBe(true);
    expect(
      sheetFormSchema.safeParse({ deliveryId: 'x', carId: '', originWarehouseId: '', startTime: '' }).success,
    ).toBe(false);
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: '', originWarehouseId: '', startTime: '24:00' }).success,
    ).toBe(false);
    expect(
      sheetFormSchema.safeParse({ deliveryId: '', carId: '', originWarehouseId: 'galpon', startTime: '' }).success,
    ).toBe(false);
  });
});
